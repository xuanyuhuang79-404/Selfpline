package com.selfpline.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.selfpline.common.AiServiceException;
import com.selfpline.config.DeepSeekConfig;
import com.selfpline.dao.AiChatLogMapper;
import com.selfpline.dao.AiCoachConfigMapper;
import com.selfpline.dao.AiCustomPlanMapper;
import com.selfpline.dao.PlanDailyLogMapper;
import com.selfpline.dao.SysUserMapper;
import com.selfpline.model.dto.deepseek.ChatMessage;
import com.selfpline.model.dto.deepseek.DeepSeekChatRequest;
import com.selfpline.model.dto.deepseek.DeepSeekChatResponse;
import com.selfpline.model.dto.request.AssistChatRequest;
import com.selfpline.model.dto.request.CoachChatRequest;
import com.selfpline.model.dto.request.PlanChatRequest;
import com.selfpline.model.dto.request.PlanInitRequest;
import com.selfpline.model.dto.response.AiScenarioResponse;
import com.selfpline.model.dto.response.CoachResponse;
import com.selfpline.model.dto.response.PlanChatResponse;
import com.selfpline.model.dto.response.PlanInitResponse;
import com.selfpline.model.entity.AiChatLog;
import com.selfpline.model.entity.AiCoachConfig;
import com.selfpline.model.entity.AiCustomPlan;
import com.selfpline.model.entity.PlanDailyLog;
import com.selfpline.model.entity.SysUser;
import com.selfpline.model.enums.ConversationType;
import com.selfpline.pattern.factory.AiCoachFactory;
import com.selfpline.pattern.strategy.AiCoachStrategy;
import com.selfpline.service.AiService;
import com.selfpline.service.DeepSeekStreamService;
import com.selfpline.service.PlanSessionManager;
import com.selfpline.service.PlanSessionManager.PlanSessionData;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiServiceImpl implements AiService {

    private final AiCoachConfigMapper coachConfigMapper;
    private final AiCoachFactory coachFactory;
    private final SysUserMapper userMapper;
    private final AiCustomPlanMapper planMapper;
    private final PlanDailyLogMapper dailyLogMapper;
    private final AiChatLogMapper chatLogMapper;
    private final RestClient deepSeekRestClient;
    private final DeepSeekConfig deepSeekConfig;
    private final ObjectMapper objectMapper;
    private final DeepSeekStreamService deepSeekStreamService;

    @Autowired(required = false)
    private PlanSessionManager sessionManager;

    private final Map<String, PlanSessionData> localPlanSessions = new ConcurrentHashMap<>();

    private static final Pattern PLAN_READY_PATTERN =
            Pattern.compile("\\[PLAN_READY\\]\\s*([\\s\\S]*?)\\s*\\[/PLAN_READY\\]");

    private static final String DEFAULT_BUILD_SCENE = "build_exercise_habit";
    private static final String DEFAULT_QUIT_SCENE = "quit_stay_up_late";
    private static final String DEFAULT_ASSIST_SCENE = "daily_checkin";
    private static final String DEFAULT_COACH_CHAT_SCENE = "coach_gentle_companion";
    private static final String DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash";
    private static final String USER_PREFERENCE_SYSTEM_MARKER = "[SelfplineUserPreference]";

    private static final Map<String, String> SCENE_COACH_TYPE_MAP = Map.ofEntries(
            Map.entry("fat_loss_shaping", "FAT_LOSS_COACH"),
            Map.entry("fitness_health", "FAT_LOSS_COACH"),
            Map.entry("rehab_training", "REHAB_COACH"),
            Map.entry("yoga_stretching", "YOGA_COACH"),
            Map.entry("focus_study", "REHAB_COACH"),
            Map.entry("sleep_routine", "REHAB_COACH"),
            Map.entry("habit_build", "REHAB_COACH"),
            Map.entry("habit_quit", "REHAB_COACH"),
            Map.entry("goal_breakdown", "REHAB_COACH"),
            Map.entry("build_custom_plan", "REHAB_COACH"),
            Map.entry("quit_custom_plan", "REHAB_COACH"),
            Map.entry("build_exercise_habit", "FAT_LOSS_COACH"),
            Map.entry("build_study_focus", "REHAB_COACH"),
            Map.entry("build_sleep_early", "REHAB_COACH"),
            Map.entry("build_hydration_diet", "REHAB_COACH"),
            Map.entry("build_reading_habit", "REHAB_COACH"),
            Map.entry("build_meditation_relax", "YOGA_COACH"),
            Map.entry("quit_stay_up_late", "REHAB_COACH"),
            Map.entry("quit_short_video", "REHAB_COACH"),
            Map.entry("quit_smoking_less", "REHAB_COACH"),
            Map.entry("quit_caffeine_control", "REHAB_COACH"),
            Map.entry("quit_junk_food", "REHAB_COACH"),
            Map.entry("quit_procrastination", "REHAB_COACH"),
            Map.entry("coach_gentle_companion", "REHAB_COACH"),
            Map.entry("coach_strict_accountability", "FAT_LOSS_COACH"),
            Map.entry("coach_professional_planner", "REHAB_COACH"),
            Map.entry("coach_study_focus", "REHAB_COACH"),
            Map.entry("coach_sports_health", "FAT_LOSS_COACH"),
            Map.entry("coach_emotional_support", "REHAB_COACH")
    );

    private static final List<AiScenarioDefinition> AI_SCENARIOS = List.of(
            new AiScenarioDefinition(
                    "fat_loss_shaping", "减脂塑形", "围绕饮食、训练和恢复建立减脂塑形计划",
                    "BUILD", "🔥", "#FF7A3D", true, true,
                    "你是 Selfpline 的减脂塑形计划指导师。请以专业、清晰、适度督促的中文回应，帮助用户把减脂或塑形目标拆成安全、可持续、可追踪的行动。"
                            + "优先关注饮食记录、训练频率、恢复、睡眠和阶段目标，不推荐极端节食或高风险训练。"
                            + "输出结构固定为：1) 目标澄清；2) 本周训练/饮食重点；3) 今日最小行动；4) 风险与恢复提醒。",
                    List.of("我想三个月减脂5kg", "帮我安排每周训练计划", "我想改善体型但不想极端节食"),
                    List.of("不建议极端节食", "不承诺确定体重结果", "出现疼痛、眩晕、胸闷等情况时建议停止并寻求专业帮助"),
                    List.of("提供一般运动与习惯建议", "不替代医生、营养师或康复师")),
            new AiScenarioDefinition(
                    "rehab_training", "康复训练", "低风险、渐进式恢复与活动能力计划",
                    "BUILD", "🧘", "#8BEA3C", true, true,
                    "你是 Selfpline 的康复训练计划指导师。请用谨慎、温和、清楚的中文回应，帮助用户建立低风险、渐进式的恢复训练或身体活动计划。"
                            + "请优先询问疼痛、病史、活动限制和医生建议；任何不适都应降低强度。"
                            + "输出结构固定为：1) 当前限制；2) 今日安全动作；3) 强度边界；4) 何时停止并求助。",
                    List.of("久坐肩颈不舒服，想每天恢复训练", "膝盖不太舒服，想做低强度计划", "帮我做一个拉伸恢复计划"),
                    List.of("不诊断疾病", "不建议带痛硬练", "有急性疼痛或明显异常时建议咨询医生或康复师"),
                    List.of("提供一般康复习惯建议", "不替代医疗诊断和康复治疗")),
            new AiScenarioDefinition(
                    "yoga_stretching", "瑜伽拉伸", "柔韧、呼吸和身体觉察练习",
                    "BUILD", "🌿", "#9B25E8", true, true,
                    "你是 Selfpline 的瑜伽拉伸计划指导师。请用平静、耐心、具体的中文回应，帮助用户设计循序渐进的瑜伽、拉伸、呼吸和放松计划。"
                            + "建议应强调舒适范围、稳定呼吸、避免疼痛和持续性。"
                            + "输出结构固定为：1) 练习目标；2) 今日动作组合；3) 呼吸与节奏；4) 结束复盘。",
                    List.of("我想每天拉伸20分钟", "帮我设计睡前瑜伽流程", "我想改善柔韧性"),
                    List.of("不要求进入疼痛姿势", "不建议高难体式冒险", "伤病或明显不适时建议停止并咨询专业人士"),
                    List.of("提供一般瑜伽拉伸建议", "不替代医疗或康复指导")),
            new AiScenarioDefinition(
                    "habit_build", "建立好习惯", "从小行动开始，把好习惯落到每天",
                    "BUILD", "🌱", "#37C978", false, true,
                    "你是 Selfpline 的习惯建立指导师。请用温和、清晰、具体的中文回应，帮助用户把想建立的习惯拆成可执行的每日动作。"
                            + "你需要优先结合用户的目标、可用时间、当前计划、近期打卡记录和遇到的困难来个性化建议。"
                            + "输出结构固定为：1) 我理解的目标；2) 今日最小行动；3) 触发场景与提醒方式；4) 复盘问题。"
                            + "建议必须短、可执行、可追踪，避免空泛鼓励和夸张承诺。",
                    List.of("我想每天阅读30分钟，怎么开始？", "我总是坚持三天就断掉，怎么办？", "帮我把早起习惯拆成今日行动"),
                    List.of("不承诺一定成功", "不建议超出用户现实时间和身体状态的计划", "遇到健康风险时建议降低强度或咨询专业人士"),
                    List.of("只提供习惯养成建议", "不替代医疗、法律、金融等专业判断")),
            new AiScenarioDefinition(
                    "habit_quit", "戒除坏习惯", "识别触发因素，设计替代行为",
                    "QUIT", "🧯", "#FF6B6B", true, true,
                    "你是 Selfpline 的坏习惯戒除指导师。请用坚定但不羞辱的语气，帮助用户识别坏习惯的触发场景、情绪诱因、替代动作和复发预案。"
                            + "你需要把戒除过程设计为渐进减量或替代行为，而不是要求用户立刻完美停止。"
                            + "输出结构固定为：1) 触发因素；2) 替代动作；3) 今日避险安排；4) 复发后的恢复步骤。"
                            + "不要制造羞耻感，不把一次失败解释为整体失败。",
                    List.of("我想戒掉睡前刷短视频", "我压力大就吃零食，怎么替代？", "帮我做一个减少咖啡的计划"),
                    List.of("不使用羞辱或恐吓表达", "不建议危险的突然停用行为", "涉及成瘾、药物或严重失控时建议寻求专业帮助"),
                    List.of("提供行为替代和复盘建议", "不做医学诊断或治疗方案")),
            new AiScenarioDefinition(
                    "build_exercise_habit", "建立运动习惯", "Build 场景：把运动变成可持续日常",
                    "BUILD", "🏃", "#FF8A3D", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Build/建立运动习惯。请围绕用户作息、可用时间、体能基础与风险边界，设计可执行、可追踪、可复盘的计划。"
                            + "输出结构固定为：1) 目标澄清；2) 每周安排；3) 今日最小行动；4) 复盘与调整。"
                            + "不要夸张承诺，不给医疗诊断。",
                    List.of("我想每周稳定运动4次", "帮我从零开始建立跑步习惯", "我想上班前做20分钟训练"),
                    List.of("不提供医疗诊断", "不推荐极端训练", "身体明显不适时建议降低强度并寻求专业帮助"),
                    List.of("仅用于创建执行计划", "不替代医生与康复师")),
            new AiScenarioDefinition(
                    "build_study_focus", "学习专注计划", "Build 场景：建立学习专注节奏",
                    "BUILD", "📚", "#5DA9FF", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Build/学习专注计划。请把目标拆成可执行学习轮次、干扰阻断和复盘机制。"
                            + "输出结构固定为：1) 目标澄清；2) 每日专注轮次；3) 干扰应对；4) 复盘指标。",
                    List.of("我想每天专注学习90分钟", "帮我制定一周学习节奏", "我总分心，怎么做计划"),
                    List.of("不鼓励熬夜硬撑", "不制造焦虑", "长期情绪或睡眠问题建议现实求助"),
                    List.of("仅用于创建计划", "不替代专业心理与医疗支持")),
            new AiScenarioDefinition(
                    "build_sleep_early", "早睡早起", "Build 场景：建立稳定作息",
                    "BUILD", "🌙", "#7C8BFF", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Build/早睡早起。请给出可执行的晚间收尾流程、起床锚点和失败恢复方案。"
                            + "输出结构固定为：1) 作息目标；2) 晚间流程；3) 明早动作；4) 复盘问题。",
                    List.of("我想23点前睡觉", "帮我一周内建立固定起床时间", "我总是睡前刷手机"),
                    List.of("不诊断睡眠障碍", "不建议药物方案", "严重失眠建议就医"),
                    List.of("仅用于计划创建", "不替代医疗建议")),
            new AiScenarioDefinition(
                    "build_hydration_diet", "饮水/健康饮食", "Build 场景：建立饮水与饮食习惯",
                    "BUILD", "🥗", "#37C978", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Build/饮水与健康饮食。请把目标拆成每日小步骤、触发提示与记录方式。"
                            + "输出结构固定为：1) 目标澄清；2) 每日动作；3) 触发与提醒；4) 复盘指标。",
                    List.of("我想每天喝够水", "帮我减少高糖零食并稳定饮食", "我经常忘记喝水"),
                    List.of("不做医学营养诊断", "不推荐极端节食", "特殊疾病人群建议咨询医生"),
                    List.of("仅用于计划创建", "不替代营养师建议")),
            new AiScenarioDefinition(
                    "build_reading_habit", "阅读习惯", "Build 场景：建立持续阅读",
                    "BUILD", "📖", "#8F7CFF", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Build/阅读习惯。请设计低门槛起步、固定触发场景和阶段复盘。"
                            + "输出结构固定为：1) 阅读目标；2) 每日动作；3) 场景触发；4) 复盘机制。",
                    List.of("我想每天阅读30分钟", "帮我养成睡前阅读", "我总是坚持不了阅读"),
                    List.of("不制造羞耻感", "不夸张承诺效果", "建议必须可执行"),
                    List.of("仅用于计划创建", "不替代教育专业服务")),
            new AiScenarioDefinition(
                    "build_meditation_relax", "冥想放松", "Build 场景：建立冥想与放松习惯",
                    "BUILD", "🧘", "#9B25E8", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Build/冥想放松。请给出短时可执行的练习计划、触发时机和复盘方式。"
                            + "输出结构固定为：1) 目标澄清；2) 练习安排；3) 触发时机；4) 复盘问题。",
                    List.of("我想每天冥想10分钟", "帮我在压力大时做放松练习", "我想建立呼吸训练习惯"),
                    List.of("不做心理诊断", "不承诺快速治愈", "若出现现实危险建议联系可信任人员或紧急服务"),
                    List.of("仅用于计划创建", "不替代心理治疗")),
            new AiScenarioDefinition(
                    "build_custom_plan", "自定义养成计划", "由用户描述想建立的计划",
                    "BUILD", "✨", "#2EA7DF", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Build/自定义养成计划。请先理解用户真正想建立的习惯，再把它收敛成每天可执行的动作、触发场景和复盘方式。"
                            + "计划必须具体、温和、可追踪，不要把目标扩大成多个互相冲突的计划。",
                    List.of("我想建立一个自己定义的新习惯", "我想每天做一件让生活更稳定的事", "帮我把这个想法变成可执行计划"),
                    List.of("不承诺确定结果", "不建议超出用户现实时间和身体状态的安排", "涉及高风险专业问题时提醒咨询专业人士"),
                    List.of("仅用于创建执行计划", "不替代医疗、法律、金融等专业判断")),
            new AiScenarioDefinition(
                    "quit_stay_up_late", "戒熬夜", "Quit 场景：减少熬夜行为",
                    "QUIT", "🌃", "#FF6B6B", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Quit/戒熬夜。请引导用户识别触发因素、替代动作、减量路径与复发恢复。"
                            + "输出结构固定为：1) 触发因素；2) 替代动作；3) 本周减量目标；4) 复发恢复步骤。",
                    List.of("我想戒掉凌晨睡觉", "总是报复性熬夜，怎么制定计划", "帮我减少夜间刷手机"),
                    List.of("不责备用户", "不提供医疗诊断", "严重睡眠问题建议就医"),
                    List.of("仅用于计划创建", "不替代医学建议")),
            new AiScenarioDefinition(
                    "quit_short_video", "减少刷短视频", "Quit 场景：减少短视频沉迷",
                    "QUIT", "📵", "#FF6B6B", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Quit/减少刷短视频。请帮助用户识别触发场景，设计替代行为和可衡量减量目标。"
                            + "输出结构固定为：1) 触发因素；2) 替代行为；3) 限额规则；4) 复发应对。",
                    List.of("我每天刷短视频停不下来", "帮我把刷视频时间降下来", "一焦虑就刷视频怎么办"),
                    List.of("不羞辱用户", "不制造焦虑", "建议必须可执行"),
                    List.of("仅用于计划创建", "不替代心理治疗")),
            new AiScenarioDefinition(
                    "quit_smoking_less", "戒烟/少烟", "Quit 场景：减少吸烟行为",
                    "QUIT", "🚭", "#FF6B6B", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Quit/戒烟或少烟。请以减量与替代为主，设计阶段目标和复发恢复路径。"
                            + "输出结构固定为：1) 触发因素；2) 替代动作；3) 减量目标；4) 复发恢复。",
                    List.of("我想把每天吸烟数量降下来", "帮我制定一个少烟计划", "压力大时总想抽烟"),
                    List.of("不提供医疗诊断", "不鼓励危险停用方式", "涉及成瘾风险建议寻求专业帮助"),
                    List.of("仅用于计划创建", "不替代戒烟门诊与医生建议")),
            new AiScenarioDefinition(
                    "quit_caffeine_control", "控制咖啡因", "Quit 场景：减少咖啡因依赖",
                    "QUIT", "☕", "#FF9C5A", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Quit/控制咖啡因。请设计循序减量与替代策略，避免一次性极端调整。"
                            + "输出结构固定为：1) 当前摄入；2) 减量节奏；3) 替代方案；4) 复盘指标。",
                    List.of("我每天喝太多咖啡", "帮我减少下午咖啡因", "晚上睡不着，想控制咖啡"),
                    List.of("不做医学诊断", "不建议极端断崖式停用", "明显不适建议就医"),
                    List.of("仅用于计划创建", "不替代医疗建议")),
            new AiScenarioDefinition(
                    "quit_junk_food", "减少外卖/垃圾食品", "Quit 场景：减少高热量外卖与零食",
                    "QUIT", "🍔", "#FF6B6B", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Quit/减少外卖和垃圾食品。请围绕触发场景、替代食物和可执行边界制定计划。"
                            + "输出结构固定为：1) 触发因素；2) 替代策略；3) 本周限额；4) 复盘问题。",
                    List.of("我想减少点外卖", "晚上总想吃垃圾食品怎么办", "帮我制定戒零食计划"),
                    List.of("不提供医疗营养诊断", "不推荐极端节食", "特殊疾病人群建议咨询医生"),
                    List.of("仅用于计划创建", "不替代营养师建议")),
            new AiScenarioDefinition(
                    "quit_procrastination", "减少拖延", "Quit 场景：降低拖延行为",
                    "QUIT", "⏱️", "#FF6B6B", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Quit/减少拖延。请把目标拆成低门槛启动动作、专注轮次和复盘机制。"
                            + "输出结构固定为：1) 拖延触发点；2) 启动动作；3) 执行节奏；4) 复盘问题。",
                    List.of("我总是拖到最后一刻", "帮我做一个反拖延计划", "我想减少刷手机拖延"),
                    List.of("不贴负面标签", "不制造焦虑", "建议必须具体可执行"),
                    List.of("仅用于计划创建", "不替代心理治疗")),
            new AiScenarioDefinition(
                    "quit_custom_plan", "自定义戒除计划", "由用户描述想减少或戒除的行为",
                    "QUIT", "🧭", "#E9340B", true, false,
                    "你是 Selfpline 的创建计划指导师，当前任务是 Quit/自定义戒除计划。请帮助用户识别想减少或戒除的具体行为、触发场景、替代动作和复发后的恢复步骤。"
                            + "计划应以渐进减量和替代行为为主，不羞辱用户，不要求一次性完美停止。",
                    List.of("我想减少一个自己定义的坏习惯", "帮我戒掉一个反复出现的行为", "我想把这个冲动降下来"),
                    List.of("不羞辱用户", "不建议危险的突然停用行为", "涉及成瘾、药物或严重失控时建议寻求专业帮助"),
                    List.of("仅用于创建执行计划", "不替代医疗或心理治疗")),
            new AiScenarioDefinition(
                    "coach_gentle_companion", "温柔陪伴型", "AI 指导师聊天：温和陪伴与鼓励",
                    "BUILD", "🌿", "#37C978", false, true,
                    "你是 Selfpline 的温柔陪伴型 AI 指导师。请用温和、接纳、具体的语气帮助用户推进日常行动。"
                            + "输出建议时保持短句、可执行、可复盘，不夸张承诺。"
                            + "如涉及自伤、自杀或现实危险，提醒用户立即联系可信任人员或当地紧急服务。",
                    List.of("今天状态一般，帮我安排一个轻量行动", "我坚持不下来，能鼓励我吗", "帮我复盘今天"),
                    List.of("不诊断用户", "不制造焦虑", "出现现实危险时建议立即求助"),
                    List.of("用于日常陪伴建议", "不替代医疗、法律、金融判断")),
            new AiScenarioDefinition(
                    "coach_strict_accountability", "严格督促型", "AI 指导师聊天：强调执行与边界",
                    "BUILD", "🔥", "#FF7A3D", false, true,
                    "你是 Selfpline 的严格督促型 AI 指导师。请用直接、清晰、负责任的语气推动用户执行，但不羞辱用户。"
                            + "输出结构固定为：1) 今天必须完成的一件事；2) 失败预案；3) 完成后复盘问题。"
                            + "如用户出现现实危险表达，请建议立即联系可信任人员或紧急服务。",
                    List.of("请直接告诉我今天必须做什么", "我总拖延，给我强执行方案", "帮我设定今晚必须完成项"),
                    List.of("不羞辱用户", "不恐吓", "现实危险场景必须建议立即求助"),
                    List.of("用于执行督促", "不替代专业服务")),
            new AiScenarioDefinition(
                    "coach_professional_planner", "专业规划型", "AI 指导师聊天：目标拆解与节奏规划",
                    "BUILD", "🎯", "#8F7CFF", false, true,
                    "你是 Selfpline 的专业规划型 AI 指导师。请把用户目标拆成阶段里程碑、周目标、日行动和复盘指标。"
                            + "建议应具体、可执行、可追踪，避免空泛鼓励。",
                    List.of("帮我把这周目标拆成每天行动", "我想做月度复盘", "帮我调整计划节奏"),
                    List.of("不承诺确定结果", "不制造焦虑", "现实危险情境建议立即求助"),
                    List.of("用于目标规划与复盘", "不替代专业咨询")),
            new AiScenarioDefinition(
                    "coach_study_focus", "学习专注型", "AI 指导师聊天：学习与专注支持",
                    "BUILD", "📚", "#5DA9FF", false, true,
                    "你是 Selfpline 的学习专注型 AI 指导师。请围绕任务切片、专注轮次、干扰管理和复盘反馈给建议。"
                            + "建议应短、具体、可马上执行。",
                    List.of("帮我开始一轮25分钟专注", "我分心了，下一步做什么", "帮我复盘今天学习"),
                    List.of("不鼓励熬夜硬撑", "不贴负面标签", "长期明显焦虑建议寻求现实支持"),
                    List.of("用于学习专注建议", "不替代医疗与心理服务")),
            new AiScenarioDefinition(
                    "coach_sports_health", "运动健康型", "AI 指导师聊天：运动与恢复建议",
                    "BUILD", "🏃", "#FF8A3D", false, true,
                    "你是 Selfpline 的运动健康型 AI 指导师。请根据用户状态给出安全、渐进、可恢复的运动建议。"
                            + "遇到疼痛、胸闷、眩晕等异常时优先建议停止高风险动作并寻求专业帮助。",
                    List.of("我今天适合做什么运动", "帮我安排训练后恢复", "我想复盘最近运动执行"),
                    List.of("不做医疗诊断", "不提供高风险训练", "明显不适时建议及时就医"),
                    List.of("用于运动健康建议", "不替代医生或康复师")),
            new AiScenarioDefinition(
                    "coach_emotional_support", "情绪支持型", "AI 指导师聊天：情绪陪伴与行动支持",
                    "BUILD", "💗", "#FF7AB6", false, true,
                    "你是 Selfpline 的情绪支持型 AI 指导师。请用温和、接纳、非评判语气帮助用户梳理情绪与压力，并给出一个现实可执行的小行动。"
                            + "不得诊断用户。若用户表达自伤、自杀、伤害他人或现实危险，请建议立即联系可信任人员或当地紧急服务。",
                    List.of("我今天很焦虑，能陪我梳理吗", "我情绪很差，下一步怎么办", "帮我做一个低压力行动"),
                    List.of("不做心理诊断", "不否定用户感受", "现实危险场景必须建议立即求助"),
                    List.of("用于情绪支持与陪伴", "不替代心理咨询与危机干预")),
            new AiScenarioDefinition(
                    "daily_checkin", "每日打卡与鼓励", "总结今天，调整明天",
                    "BUILD", "✅", "#FFC857", false, true,
                    "你是 Selfpline 的每日打卡指导师。请基于用户今天的完成情况、备注、当前计划和最近7天记录，给出短而具体的反馈。"
                            + "如果用户完成了，请指出有效行为并鼓励复用；如果未完成，请帮助找到一个可恢复的小动作。"
                            + "输出结构固定为：1) 今日反馈；2) 一个原因线索；3) 明天一个微调；4) 一句不夸张的鼓励。"
                            + "回复应简洁，避免长篇讲道理。",
                    List.of("我今天没完成，帮我复盘", "今天完成了，明天怎么保持？", "根据今天记录给我一点鼓励"),
                    List.of("不因未完成而责备用户", "不鼓励过度补偿", "发现身体不适或情绪危机时优先建议休息和现实支持"),
                    List.of("只做打卡反馈和轻量建议", "不替代专业心理咨询")),
            new AiScenarioDefinition(
                    "weekly_review", "周复盘", "看见趋势，调整下一周",
                    "BUILD", "📈", "#2EA7DF", false, true,
                    "你是 Selfpline 的周复盘指导师。请帮助用户基于一周计划完成率、连续天数、备注和失败原因，发现可延续的模式和需要调整的阻碍。"
                            + "输出结构固定为：1) 本周亮点；2) 主要阻碍；3) 下周保留一件事；4) 下周调整一件事；5) 一个复盘问题。"
                            + "请把建议控制在少量关键动作，不一次性塞太多任务。",
                    List.of("帮我复盘这一周", "我这周断了两次，问题在哪里？", "下周计划怎么调轻一点？"),
                    List.of("不把短期波动解释为失败", "不要求用户用惩罚弥补", "涉及健康或情绪风险时建议寻求现实帮助"),
                    List.of("基于习惯数据做趋势建议", "不输出专业诊断")),
            new AiScenarioDefinition(
                    "goal_breakdown", "目标拆解", "把长期目标拆成阶段与动作",
                    "BUILD", "🎯", "#8F7CFF", false, true,
                    "你是 Selfpline 的目标拆解指导师。请把用户的模糊目标拆成阶段里程碑、每周重点、每日行动、追踪指标和风险预案。"
                            + "当目标过大时，先帮用户收敛范围，再给出第一阶段行动。"
                            + "输出结构固定为：1) 目标澄清；2) 30天阶段目标；3) 本周重点；4) 今日行动；5) 追踪指标。"
                            + "建议要能进入 Selfpline 的习惯计划。",
                    List.of("我想变自律，帮我拆目标", "把减脂目标拆成30天计划", "我想提高学习效率，第一周做什么？"),
                    List.of("不承诺确定结果", "不建议极端节食或高风险训练", "目标涉及专业领域时提醒咨询专业人士"),
                    List.of("做目标管理和行动拆解", "不替用户做高风险决策")),
            new AiScenarioDefinition(
                    "focus_study", "学习/专注", "设计专注节奏与抗干扰策略",
                    "BUILD", "📚", "#5DA9FF", false, true,
                    "你是 Selfpline 的学习专注指导师。请围绕任务切片、专注时段、休息节奏、干扰阻断和复盘反馈设计建议。"
                            + "优先推荐可持续的短时专注，而不是超长学习。"
                            + "输出结构固定为：1) 当前任务切片；2) 一轮专注安排；3) 干扰处理；4) 结束复盘问题。"
                            + "当用户焦虑或拖延时，先降低启动门槛。",
                    List.of("我总是学不进去，怎么开始？", "帮我安排一小时专注学习", "我写作业总分心怎么办？"),
                    List.of("不鼓励熬夜硬撑", "不把拖延归因为人格问题", "严重焦虑或长期失眠时建议寻求专业支持"),
                    List.of("提供学习方法和专注策略", "不替代教育、医疗或心理专业服务")),
            new AiScenarioDefinition(
                    "fitness_health", "运动与健康", "安全渐进的运动与健康指导",
                    "BUILD", "🏃", "#FF8A3D", false, true,
                    "你是 Selfpline 的运动健康指导师。请结合用户身高体重、健康目标、病史、当前运动基础和打卡记录，给出安全、渐进、可恢复的运动建议。"
                            + "输出结构固定为：1) 今日适合强度；2) 训练动作或活动；3) 恢复提醒；4) 何时降低强度。"
                            + "如用户描述疼痛、胸闷、眩晕、伤病或明显不适，应优先建议停止高风险动作并寻求专业帮助。",
                    List.of("今天适合做什么运动？", "我刚开始减脂，怎么安排？", "运动后膝盖不舒服怎么办？"),
                    List.of("不诊断疾病", "不提供高风险训练或极端饮食方案", "身体异常信号出现时建议停止并寻求专业帮助"),
                    List.of("只提供一般运动健康建议", "不替代医生、康复师或营养师")),
            new AiScenarioDefinition(
                    "sleep_routine", "睡眠作息", "稳定入睡、起床与晚间节奏",
                    "BUILD", "🌙", "#7C8BFF", false, true,
                    "你是 Selfpline 的睡眠作息指导师。请帮助用户建立固定起床时间、睡前降噪流程、光照管理、咖啡因边界和晚间收尾动作。"
                            + "输出结构固定为：1) 今晚一个调整；2) 明早一个锚点；3) 避免事项；4) 明天复盘问题。"
                            + "建议要温和且可坚持，不把偶发失眠解释为严重问题。",
                    List.of("我总是晚睡，今晚怎么调整？", "帮我设计睡前流程", "明天想早起，今天要做什么？"),
                    List.of("不诊断睡眠障碍", "不建议自行使用药物", "长期严重失眠或影响安全时建议就医"),
                    List.of("提供作息习惯建议", "不替代医学睡眠治疗")),
            new AiScenarioDefinition(
                    "emotional_support", "情绪支持", "温和陪伴，整理压力和感受",
                    "BUILD", "💗", "#FF7AB6", false, true,
                    "你是 Selfpline 的情绪支持指导师。请用温和、接纳、非评判的方式帮助用户描述情绪、识别压力来源，并找到下一步很小的现实行动。"
                            + "输出结构固定为：1) 先接住用户的感受；2) 帮用户命名可能的压力；3) 一个可执行的小行动；4) 一个可以继续说下去的问题。"
                            + "你不能诊断用户，不能替代心理治疗。如用户表达自伤、自杀、伤害他人或现实危险，请建议立即联系身边可信任的人、当地紧急服务或专业危机热线。",
                    List.of("我今天很崩溃，能陪我梳理一下吗？", "我没有动力继续打卡", "我压力很大，下一步做什么？"),
                    List.of("不做心理诊断", "不否定用户感受", "出现自伤、自杀、伤害他人或现实危险时建议立即寻求现实帮助"),
                    List.of("提供情绪梳理和轻量行动建议", "不替代心理咨询、精神科或紧急救助"))
    );

    private static final Map<String, AiScenarioDefinition> AI_SCENARIO_MAP = AI_SCENARIOS.stream()
            .collect(Collectors.toMap(AiScenarioDefinition::sceneKey, definition -> definition));

    private static final Map<String, String> LEGACY_SCENE_ALIASES = Map.of(
            "HABIT_BUILD_COACH", "build_exercise_habit",
            "BAD_HABIT_QUIT_COACH", "quit_stay_up_late",
            "DAILY_REVIEW_COACH", "daily_checkin",
            "GOAL_BREAKDOWN_COACH", "goal_breakdown",
            "STUDY_FOCUS_COACH", "focus_study",
            "EXERCISE_HEALTH_COACH", "fitness_health",
            "SLEEP_ROUTINE_COACH", "sleep_routine",
            "EMOTION_SUPPORT_COACH", "emotional_support"
    );

    private record PlanReadyResult(String cleanedResponse, boolean planReady, Map<String, Object> planSummary) {}

    private record AiScenarioDefinition(String sceneKey, String sceneName, String sceneDescription,
                                        String defaultDirection, String icon, String accentColor,
                                        boolean planCreationSupported, boolean assistSupported,
                                        String systemPrompt, List<String> suggestedUserInputs,
                                        List<String> safetyRules, List<String> boundaries) {}

    @Override
    public List<CoachResponse> getAvailableCoaches() {
        return coachConfigMapper.findAllActive().stream()
                .map(c -> CoachResponse.builder()
                        .coachKey(c.getCoachKey())
                        .coachName(c.getCoachName())
                        .coachAvatar(c.getCoachAvatar())
                        .coachDescription(c.getCoachDescription())
                        .tags(c.getTags())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<AiScenarioResponse> getAiScenarios() {
        return AI_SCENARIOS.stream()
                .map(scene -> AiScenarioResponse.builder()
                        .sceneKey(scene.sceneKey())
                        .sceneName(scene.sceneName())
                        .sceneDescription(scene.sceneDescription())
                        .category(resolveSceneCategory(scene))
                        .description(scene.sceneDescription())
                        .systemPrompt(scene.systemPrompt())
                        .defaultDirection(scene.defaultDirection())
                        .icon(scene.icon())
                        .accentColor(scene.accentColor())
                        .planCreationSupported(scene.planCreationSupported())
                        .assistSupported(scene.assistSupported())
                        .coachChatSupported(isCoachChatScene(scene.sceneKey()))
                        .suggestedUserInputs(scene.suggestedUserInputs())
                        .safetyRules(scene.safetyRules())
                        .boundaries(scene.boundaries())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public PlanInitResponse initPlanCreation(Long userId, PlanInitRequest request) {
        // 1. Validate
        if (request.getDirection() == null ||
                (!"BUILD".equalsIgnoreCase(request.getDirection()) && !"QUIT".equalsIgnoreCase(request.getDirection()))) {
            throw new IllegalArgumentException("计划方向必须为 BUILD 或 QUIT");
        }
        if (request.getTopic() == null || request.getTopic().isBlank()) {
            throw new IllegalArgumentException("计划主题不能为空");
        }
        String direction = request.getDirection().toUpperCase();
        String sceneKey = resolvePlanCreationSceneKey(request.getSceneKey(), direction);
        String coachType = resolveCoachTypeForScene(sceneKey, request.getCoachType());

        // 2. Load user
        SysUser user = userMapper.selectById(userId);
        if (user == null) {
            throw new IllegalArgumentException("用户不存在");
        }

        // 4. Build user context
        buildUserContext(user);

        // 5. Get coach strategy
        try {
            coachFactory.getStrategy(coachType);
        } catch (IllegalArgumentException e) {
            throw new AiServiceException(e.getMessage());
        }

        // 5. Assemble full system prompt
        String fullSystemPrompt = assembleSystemPrompt(coachType, direction, request.getTopic(), userId, sceneKey);

        // 6. Build first user message
        String directionLabel = "BUILD".equals(direction) ? "养成习惯" : "戒除习惯";
        String firstUserMessage = "我想建立一个新计划：" + request.getTopic()
                + "。计划方向是" + directionLabel
                + "。如果这些信息已经足够，请直接生成一个初版计划；只有缺少最基本目标时，再问我一个必要问题。";

        // 7. Generate sessionId
        String sessionId = UUID.randomUUID().toString();

        // 8. Create PlanSessionData
        PlanSessionData sessionData = new PlanSessionData();
        sessionData.setCoachType(coachType);
        sessionData.setDirection(direction);
        sessionData.setTopic(request.getTopic());
        sessionData.setSceneKey(sceneKey);
        sessionData.setUserId(userId);

        // 9-10. Add system and user messages to the data's messages list
        sessionData.getMessages().add(new ChatMessage("system", fullSystemPrompt));
        sessionData.getMessages().add(new ChatMessage("user", firstUserMessage));
        applyUserPreference(sessionData.getMessages(), user);

        // 11. Create session in Redis or local fallback when Redis is disabled
        createPlanSession(sessionId, sessionData);

        // 12. Call DeepSeek API
        String aiResponse = callDeepSeek(sessionData.getMessages());

        // 13. Extract planReady marker from response
        PlanReadyResult result = extractPlanReadyMarker(aiResponse);

        // 14. Save chat log
        saveChatLog(userId, null, ConversationType.PLAN_CREATION,
                buildCoachRole(coachType, sceneKey), firstUserMessage, result.cleanedResponse());

        // 15. Return PlanInitResponse
        return new PlanInitResponse(sessionId, result.cleanedResponse());
    }

    @Override
    public PlanChatResponse continuePlanChat(Long userId, PlanChatRequest request) {
        // 1. Get session from Redis or local fallback by sessionId
        PlanSessionData session = getPlanSession(request.getSessionId());
        if (session == null) {
            throw new IllegalArgumentException("会话已过期，请重新开始");
        }

        // 2. Verify session.userId equals userId (security check)
        if (!userId.equals(session.getUserId())) {
            throw new IllegalArgumentException("会话验证失败");
        }

        // 3. Append user message to session
        addPlanSessionMessage(request.getSessionId(), new ChatMessage("user", request.getMessage()));

        // 4. Get updated session, extract full messages list
        PlanSessionData updatedSession = getPlanSession(request.getSessionId());
        List<ChatMessage> messages = updatedSession != null ? updatedSession.getMessages() : session.getMessages();
        applyUserPreference(messages, userMapper.selectById(userId));

        // 5. Call DeepSeek API
        String aiResponse = callDeepSeek(messages);

        // 6. Extract planReady marker
        PlanReadyResult result = extractPlanReadyMarker(aiResponse);

        // 7. Append AI response to session
        addPlanSessionMessage(request.getSessionId(), new ChatMessage("assistant", result.cleanedResponse()));

        // 8. Save chat log
        String sceneKey = resolvePlanCreationSceneKey(
                request.getSceneKey() != null ? request.getSceneKey() : session.getSceneKey(),
                session.getDirection());
        String coachType = resolveCoachTypeForScene(sceneKey, session.getCoachType());
        saveChatLog(userId, null, ConversationType.PLAN_CREATION,
                buildCoachRole(coachType, sceneKey), request.getMessage(), result.cleanedResponse());

        // 9. Return PlanChatResponse
        return new PlanChatResponse(result.cleanedResponse(), result.planReady(), result.planSummary());
    }

    @Override
    public String assistChat(Long userId, AssistChatRequest request) {
        // 1. Validate plan
        AiCustomPlan plan = planMapper.selectById(request.getPlanId());
        if (plan == null || !userId.equals(plan.getUserId())) {
            throw new IllegalArgumentException("计划不存在");
        }

        // 2. Load user profile
        SysUser user = userMapper.selectById(userId);

        // 3. Build system prompt: coach strategy + plan context
        String planDirection = plan.getPlanDirection() != null ? plan.getPlanDirection().name() : "";
        String sceneKey = resolveSceneKey(request.getSceneKey(), planDirection);
        String coachType = resolveCoachTypeForScene(sceneKey, plan.getCoachType());
        AiCoachStrategy strategy = coachFactory.getStrategy(coachType);
        String userContext = buildUserContext(user);
        String planContent = plan.getPlanContent() != null ? plan.getPlanContent() : "";
        String targetName = plan.getTargetName() != null ? plan.getTargetName() : "";
        String planContext = "计划内容:" + planContent
                + ", 方向:" + planDirection
                + ", 目标:" + targetName
                + ", 近期记录:" + buildRecentLogContext(plan.getId());
        String systemPrompt = strategy.getSystemPrompt(userContext, planContext)
                + "\n\n---\n当前指导场景:\n" + resolveScenePrompt(sceneKey);

        // 4. Load recent 15 history messages from DB (DESC order, reverse to chronological)
        List<AiChatLog> recentLogs = chatLogMapper.findRecentByPlanId(
                plan.getId(), ConversationType.DAILY_ASSIST.getCode(), 15);
        if (recentLogs == null) {
            recentLogs = new ArrayList<>();
        }
        Collections.reverse(recentLogs);

        // 5. Build messages list: system + history + new user message
        List<ChatMessage> messages = new ArrayList<>();
        messages.add(new ChatMessage("system", systemPrompt));
        applyUserPreference(messages, user);
        for (AiChatLog log : recentLogs) {
            messages.add(new ChatMessage("user", log.getUserMessage()));
            messages.add(new ChatMessage("assistant", log.getAiResponse()));
        }
        messages.add(new ChatMessage("user", request.getMessage()));

        // 6. Call DeepSeek API
        String aiResponse = callDeepSeek(messages);

        // 7. Save chat log
        saveChatLog(userId, plan.getId(), ConversationType.DAILY_ASSIST,
                buildCoachRole(coachType, sceneKey), request.getMessage(), aiResponse);

        // 8. Return the AI response string
        return aiResponse;
    }

    @Override
    public String coachChat(Long userId, CoachChatRequest request) {
        String sceneKey = resolveCoachChatSceneKey(request.getSceneKey());
        AiScenarioDefinition scene = AI_SCENARIO_MAP.get(sceneKey);
        if (scene == null) {
            throw new IllegalArgumentException("无效的 AI 指导师场景");
        }

        SysUser user = userMapper.selectById(userId);
        String userContext = buildUserContext(user);
        String coachRole = buildCoachRole("COACH_CHAT", sceneKey);
        AiCoachConfig config = coachConfigMapper.findByCoachKey(sceneKey);
        String basePrompt = config != null && config.getSystemPrompt() != null && !config.getSystemPrompt().isBlank()
                ? config.getSystemPrompt()
                : scene.systemPrompt();
        String systemPrompt = basePrompt
                + "\n\n---\n当前身份:\n" + scene.sceneName()
                + "\n场景类别: coach_chat"
                + "\n用户画像:\n" + userContext
                + "\n安全要求:\n" + String.join("；", scene.safetyRules())
                + "\n建议输入:\n" + String.join("；", scene.suggestedUserInputs());

        List<AiChatLog> recentLogs = chatLogMapper.findRecentIndependentByRole(
                userId, ConversationType.INDEPENDENT_CONSULT.getCode(), coachRole, 12);
        if (recentLogs == null) {
            recentLogs = new ArrayList<>();
        }
        Collections.reverse(recentLogs);

        List<ChatMessage> messages = new ArrayList<>();
        messages.add(new ChatMessage("system", systemPrompt));
        applyUserPreference(messages, user);
        for (AiChatLog log : recentLogs) {
            if (log.getUserMessage() != null && !log.getUserMessage().isBlank()) {
                messages.add(new ChatMessage("user", log.getUserMessage()));
            }
            if (log.getAiResponse() != null && !log.getAiResponse().isBlank()) {
                messages.add(new ChatMessage("assistant", log.getAiResponse()));
            }
        }
        messages.add(new ChatMessage("user", request.getMessage()));

        String aiResponse = callDeepSeek(messages);
        saveChatLog(userId, null, ConversationType.INDEPENDENT_CONSULT,
                coachRole, request.getMessage(), aiResponse);
        return aiResponse;
    }

    @Override
    public List<AiChatLog> getAssistChatHistory(Long userId, Long planId, int page, int size) {
        AiCustomPlan plan = planMapper.selectById(planId);
        if (plan == null || !userId.equals(plan.getUserId())) {
            throw new IllegalArgumentException("计划不存在");
        }
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        int limit = page * size;
        List<AiChatLog> all = chatLogMapper.findRecentByPlanId(
                planId, ConversationType.DAILY_ASSIST.getCode(), limit);
        if (all == null || all.isEmpty()) {
            return Collections.emptyList();
        }
        int fromIndex = (page - 1) * size;
        if (fromIndex >= all.size()) {
            return Collections.emptyList();
        }
        int toIndex = Math.min(fromIndex + size, all.size());
        return all.subList(fromIndex, toIndex);
    }

    // ========================================================================
    // Private Helper Methods
    // ========================================================================

    private String callDeepSeek(List<ChatMessage> messages) {
        String apiKey = deepSeekConfig.getApiKey();
        if (apiKey == null || apiKey.isBlank() || "your-api-key".equalsIgnoreCase(apiKey.trim())) {
            throw new AiServiceException("DeepSeek API Key 未配置，请检查 DEEPSEEK_API_KEY 或 application.yml");
        }
        if (apiKey.trim().length() < 10) {
            throw new AiServiceException("DeepSeek API Key 太短，可能无效");
        }
        if (deepSeekConfig.getBaseUrl() == null || deepSeekConfig.getBaseUrl().isBlank()) {
            throw new AiServiceException("DeepSeek baseUrl 未配置");
        }
        String baseUrl = deepSeekConfig.getBaseUrl().trim();
        if (!baseUrl.startsWith("https://") && !baseUrl.startsWith("http://")) {
            throw new AiServiceException("DeepSeek baseUrl 必须以 http:// 或 https:// 开头");
        }
        String model = resolveDeepSeekModel();
        if (model == null || model.isBlank()) {
            throw new AiServiceException("DeepSeek model 未配置");
        }
        try {
            DeepSeekChatRequest request = DeepSeekChatRequest.builder()
                    .model(resolveDeepSeekModel())
                    .messages(messages)
                    .build();
            ResponseEntity<String> responseEntity = deepSeekRestClient.post()
                    .uri("/chat/completions")
                    .body(request)
                    .exchange((clientReq, clientRes) -> {
                        byte[] bodyBytes = clientRes.getBody().readAllBytes();
                        String body = new String(bodyBytes, java.nio.charset.StandardCharsets.UTF_8);
                        return ResponseEntity.status(clientRes.getStatusCode())
                                .headers(clientRes.getHeaders())
                                .body(body);
                    });
            if (!responseEntity.getStatusCode().is2xxSuccessful()) {
                String errorBody = responseEntity.getBody() != null ? responseEntity.getBody() : "";
                log.error("DeepSeek API error response ({}): {}", responseEntity.getStatusCode(), errorBody);
                throw new AiServiceException(
                        "DeepSeek API调用失败: HTTP " + responseEntity.getStatusCode().value() + " - " + errorBody);
            }
            String responseBody = responseEntity.getBody();
            if (responseBody == null || responseBody.isBlank()) {
                throw new AiServiceException("DeepSeek API返回空响应");
            }
            DeepSeekChatResponse response;
            try {
                response = objectMapper.readValue(responseBody, DeepSeekChatResponse.class);
            } catch (JsonProcessingException e) {
                if (responseBody.contains("\"error\"")) {
                    throw new AiServiceException("DeepSeek API返回错误: " + responseBody);
                }
                throw new AiServiceException("DeepSeek API响应解析失败: " + e.getMessage(), e);
            }
            if (response == null || response.getChoices() == null || response.getChoices().isEmpty()) {
                throw new AiServiceException("AI未返回有效响应");
            }
            if (response.getModel() != null && response.getModel().toLowerCase().contains("pro")) {
                throw new AiServiceException("DeepSeek 返回了不允许的 pro 模型响应");
            }
            DeepSeekChatResponse.Choice firstChoice = response.getChoices().get(0);
            if (firstChoice == null || firstChoice.getMessage() == null) {
                throw new AiServiceException("AI响应消息为空");
            }
            String content = firstChoice.getMessage().getContent();
            if (content == null || content.isBlank()) {
                throw new AiServiceException("AI响应内容为空");
            }
            return content;
        } catch (ResourceAccessException e) {
            log.error("DeepSeek network error or timeout", e);
            throw new AiServiceException("DeepSeek 网络异常或请求超时，请稍后重试", e);
        } catch (AiServiceException e) {
            log.error("DeepSeek call failed: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("DeepSeek unexpected error", e);
            throw new AiServiceException("调用DeepSeek API时发生错误: " + e.getMessage(), e);
        }
    }

    private String resolveDeepSeekModel() {
        String configuredModel = deepSeekConfig.getModel();
        if (configuredModel == null || configuredModel.isBlank()) {
            log.warn("DeepSeek model not configured, using default: {}", DEFAULT_DEEPSEEK_MODEL);
            return DEFAULT_DEEPSEEK_MODEL;
        }
        String trimmed = configuredModel.trim();
        if (!trimmed.matches("^[a-zA-Z0-9][a-zA-Z0-9._\\-]{0,63}$")) {
            log.warn("DeepSeek model name looks invalid: '{}', using default: {}", trimmed, DEFAULT_DEEPSEEK_MODEL);
            return DEFAULT_DEEPSEEK_MODEL;
        }
        return trimmed;
    }

    private PlanReadyResult extractPlanReadyMarker(String aiResponse) {
        Matcher matcher = PLAN_READY_PATTERN.matcher(aiResponse);
        if (matcher.find()) {
            try {
                String jsonBlock = matcher.group(1);
                @SuppressWarnings("unchecked")
                Map<String, Object> planData = objectMapper.readValue(jsonBlock, Map.class);
                Boolean ready = (Boolean) planData.getOrDefault("planReady", false);
                @SuppressWarnings("unchecked")
                Map<String, Object> summary = (Map<String, Object>) planData.getOrDefault(
                        "planSummary", Collections.emptyMap());
                String cleaned = matcher.replaceFirst("").trim();
                return new PlanReadyResult(cleaned, Boolean.TRUE.equals(ready), summary);
            } catch (JsonProcessingException e) {
                log.warn("PLAN_READY marker parse failed, returning response as-is without plan: {}", e.getMessage());
            }
        }
        return new PlanReadyResult(aiResponse, false, Collections.emptyMap());
    }

    private String buildUserContext(SysUser user) {
        if (user == null) {
            return "暂无用户档案";
        }
        StringBuilder sb = new StringBuilder();
        if (user.getHeight() != null) {
            sb.append("身高:").append(user.getHeight()).append("cm, ");
        }
        if (user.getWeight() != null) {
            sb.append("体重:").append(user.getWeight()).append("kg, ");
        }
        if (user.getHealthGoal() != null && !user.getHealthGoal().isBlank()) {
            sb.append("健身目标:").append(user.getHealthGoal()).append(", ");
        }
        if (user.getMedicalHistory() != null && !user.getMedicalHistory().isBlank()) {
            sb.append("病史:").append(user.getMedicalHistory()).append(", ");
        }
        String ctx = sb.toString();
        return ctx.endsWith(", ") ? ctx.substring(0, ctx.length() - 2) : ctx;
    }

    private String buildUserPreferencePrompt(SysUser user) {
        if (user == null || user.getAiPreferencePrompt() == null || user.getAiPreferencePrompt().isBlank()) {
            return "";
        }
        return USER_PREFERENCE_SYSTEM_MARKER
                + "\n用户在 Profile 中设置了全局 AI 个性化偏好。它用于影响回答风格、称呼、偏好和输出方式；"
                + "必须服从 Selfpline 的安全边界、当前模块任务、必需输出结构、内部 JSON/标记规则与专业边界。"
                + "如果用户偏好与模块任务冲突，保持任务必要结构，同时尽量遵循用户偏好的表达风格。\n"
                + "用户偏好:\n" + user.getAiPreferencePrompt().trim();
    }

    private void applyUserPreference(List<ChatMessage> messages, SysUser user) {
        if (messages == null) {
            return;
        }
        messages.removeIf(message -> "system".equals(message.getRole())
                && message.getContent() != null
                && message.getContent().startsWith(USER_PREFERENCE_SYSTEM_MARKER));
        String preferencePrompt = buildUserPreferencePrompt(user);
        if (preferencePrompt.isBlank()) {
            return;
        }
        int insertIndex = 0;
        for (int i = 0; i < messages.size(); i++) {
            if ("system".equals(messages.get(i).getRole())) {
                insertIndex = i + 1;
                break;
            }
        }
        messages.add(insertIndex, new ChatMessage("system", preferencePrompt));
    }

    private String assembleSystemPrompt(String coachType, String direction, String topic, Long userId, String sceneKey) {
        // 1. Get strategy
        AiCoachStrategy strategy = coachFactory.getStrategy(coachType);

        // 2. Get user and build context
        SysUser user = userMapper.selectById(userId);
        String userContext = buildUserContext(user);

        // 3. Call strategy.getSystemPrompt with plan context
        String planContext = "方向:" + direction + ", 主题:" + topic + ", 场景:" + sceneKey;
        String basePrompt = strategy.getSystemPrompt(userContext, planContext);

        // 4. Append direction instruction
        String directionInstruction = buildDirectionInstruction(direction, topic);
        String sceneInstruction = resolveScenePrompt(sceneKey);
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(30);
        int planDirectionCode = "QUIT".equalsIgnoreCase(direction) ? 2 : 1;

        // 5. Append PLAN_READY detection instruction
        String planReadyInstruction = "\n计划生成规则：\n"
                + "- 如果用户已经给出明确目标/行为，或表达“不想细聊”“直接开始”“先生成”“快速创建”“不用细问”等意图，请基于现有信息直接生成一个合理的初版计划，并在回复末尾附加以下JSON(不要包含在其他地方):\n"
                + "[PLAN_READY]\n"
                + "{\"planReady\":true,\"planSummary\":{\"targetName\":\"计划名称\",\"shortName\":\"短名\",\"trackingMode\":1,"
                + "\"planDirection\":" + planDirectionCode + ",\"planContent\":\"完整的执行计划(Markdown格式)\","
                + "\"coachType\":\"" + coachType + "\","
                + "\"startDate\":\"" + startDate + "\",\"endDate\":\"" + endDate + "\","
                + "\"themeColor\":\"#4CAF50\",\"icon\":\"🏃\"}}\n"
                + "[/PLAN_READY]\n"
                + "- trackingMode 当前必须固定为 1=复选框打卡。\n"
                + "- planDirection: 1=BUILD 2=QUIT。\n"
                + "- shortName 是首页缩略指代，必须短、稳定、可辨识，例如“晨跑训练”“睡前阅读”“减短视频”。\n"
                + "- 图标请根据主题选择合适的emoji。\n"
                + "- planContent 需要包含：计划目标、每日打钩判定、默认执行时间/场景、第一周最小行动、后续递进方式、失败后的重置方式。Quit计划还要包含触发场景、替代动作和复发恢复步骤。\n"
                + "- 不要为了收集偏好、时间、强度等细节连续追问；这些细节可以在初版计划中给出可调整的默认值。\n"
                + "- 默认计划周期为30天，从" + startDate + "开始，到" + endDate + "结束；如果用户没给时间，就不要再追问时间。\n"
                + "- 只有当用户没有给出任何可执行目标，或目标存在明显安全/现实风险时，才继续提问；此时最多问一个关键问题，且不要附加PLAN_READY。";

        // Style guide for natural, product-like AI output
        String styleGuide = "\n\n回复风格要求：\n"
                + "- 用自然对话的语气，不要输出固定编号清单(1)...2)...3)...4)...)\n"
                + "- 像一位真实的私人教练或陪伴者那样说话，不要机械地说\"输出结构固定为\"\n"
                + "- 每条回复可以适当使用1-3个emoji表情符号增强亲和力，不要过量\n"
                + "- 不要提及\"作为一个AI\"、\"根据系统提示\"、\"PLAN_READY\"等词汇\n"
                + "- 格式标记[PLAN_READY]和JSON是内部使用，绝对不要向用户提及或展示\n"
                + "- 用户想快速开始时，优先给出初版计划，不要把聊天流程拖长\n"
                + "- 生成计划时可以说\"我已经可以帮你整理一个初版计划了\"而不是\"输出\"\n"
                + "- 保持回复简洁、可执行、有温度";

        return basePrompt + "\n\n场景指导:\n" + sceneInstruction + "\n\n" + directionInstruction + planReadyInstruction + styleGuide;
    }

    private String buildDirectionInstruction(String direction, String topic) {
        if ("BUILD".equalsIgnoreCase(direction)) {
            return "你正在帮助用户建立一个新习惯：" + topic
                    + "。用户方向为养成(BUILD)。你需要设定清晰、可执行的目标，"
                    + "使用复选框打卡作为唯一追踪方式，制定具体执行计划。";
        } else {
            return "你正在帮助用户戒除一个习惯：" + topic
                    + "。用户方向为戒除(QUIT)。你需要了解习惯频率和严重程度，找到触发因素和替代方案，"
                    + "设定阶段性减量目标，制定渐进式戒除计划。";
        }
    }

    private String resolveSceneKey(String requestedSceneKey, String direction) {
        String normalizedSceneKey = normalizeSceneKey(requestedSceneKey);
        if (normalizedSceneKey != null && AI_SCENARIO_MAP.containsKey(normalizedSceneKey)) {
            return normalizedSceneKey;
        }
        if ("QUIT".equalsIgnoreCase(direction)) {
            return DEFAULT_QUIT_SCENE;
        }
        if ("BUILD".equalsIgnoreCase(direction)) {
            return DEFAULT_BUILD_SCENE;
        }
        return DEFAULT_ASSIST_SCENE;
    }

    private String resolvePlanCreationSceneKey(String requestedSceneKey, String direction) {
        String sceneKey = resolveSceneKey(requestedSceneKey, direction);
        if (isPlanCreationScene(sceneKey)) {
            return sceneKey;
        }
        return "QUIT".equalsIgnoreCase(direction) ? DEFAULT_QUIT_SCENE : DEFAULT_BUILD_SCENE;
    }

    private String resolveCoachChatSceneKey(String requestedSceneKey) {
        String normalizedSceneKey = normalizeSceneKey(requestedSceneKey);
        if (normalizedSceneKey != null && isCoachChatScene(normalizedSceneKey)) {
            return normalizedSceneKey;
        }
        return DEFAULT_COACH_CHAT_SCENE;
    }

    private boolean isPlanCreationScene(String sceneKey) {
        AiScenarioDefinition scene = AI_SCENARIO_MAP.get(normalizeSceneKey(sceneKey));
        return scene != null && scene.planCreationSupported();
    }

    private boolean isCoachChatScene(String sceneKey) {
        String normalizedSceneKey = normalizeSceneKey(sceneKey);
        return normalizedSceneKey != null
                && normalizedSceneKey.startsWith("coach_")
                && AI_SCENARIO_MAP.containsKey(normalizedSceneKey);
    }

    private String resolveSceneCategory(AiScenarioDefinition scene) {
        if (isCoachChatScene(scene.sceneKey())) {
            return "coach_chat";
        }
        return scene.planCreationSupported() ? "plan_creation" : "coach_chat";
    }

    private String resolveScenePrompt(String sceneKey) {
        AiScenarioDefinition scene = AI_SCENARIO_MAP.get(normalizeSceneKey(sceneKey));
        if (scene == null) {
            scene = AI_SCENARIO_MAP.get(DEFAULT_ASSIST_SCENE);
        }
        return scene.systemPrompt();
    }

    private String resolveCoachTypeForScene(String sceneKey, String requestedCoachType) {
        String normalizedSceneKey = normalizeSceneKey(sceneKey);
        String mappedCoachType = SCENE_COACH_TYPE_MAP.get(normalizedSceneKey);
        if (mappedCoachType != null) {
            return mappedCoachType;
        }
        if (requestedCoachType != null && !requestedCoachType.isBlank()) {
            return requestedCoachType.trim();
        }
        return "REHAB_COACH";
    }

    private String normalizeSceneKey(String sceneKey) {
        if (sceneKey == null || sceneKey.isBlank()) {
            return null;
        }
        String trimmed = sceneKey.trim();
        return LEGACY_SCENE_ALIASES.getOrDefault(trimmed, trimmed);
    }

    private String buildRecentLogContext(Long planId) {
        if (planId == null) {
            return "暂无计划记录";
        }
        LocalDate today = LocalDate.now();
        List<PlanDailyLog> logs = dailyLogMapper.findByPlanIdAndDateRange(planId, today.minusDays(7), today);
        if (logs == null || logs.isEmpty()) {
            return "最近7天暂无打卡记录";
        }
        return logs.stream()
                .sorted(Comparator.comparing(PlanDailyLog::getRecordDate, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(log -> {
                    String status = Boolean.TRUE.equals(log.getIsCompleted()) ? "完成" : "未完成";
                    return log.getRecordDate() + ":" + status;
                })
                .collect(Collectors.joining("; "));
    }

    private String buildCoachRole(String coachType, String sceneKey) {
        return coachType + ":" + sceneKey;
    }

    private void createPlanSession(String sessionId, PlanSessionData data) {
        if (sessionManager != null) {
            sessionManager.createSession(sessionId, data);
            return;
        }
        localPlanSessions.put(sessionId, data);
    }

    private PlanSessionData getPlanSession(String sessionId) {
        if (sessionManager != null) {
            return sessionManager.getSession(sessionId);
        }
        return localPlanSessions.get(sessionId);
    }

    private void addPlanSessionMessage(String sessionId, ChatMessage message) {
        if (sessionManager != null) {
            sessionManager.addMessage(sessionId, message);
            return;
        }
        PlanSessionData session = localPlanSessions.get(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("会话已过期，请重新开始");
        }
        session.getMessages().add(message);
    }

    private void saveChatLog(Long userId, Long planId, ConversationType type,
                             String coachRole, String userMessage, String aiResponse) {
        AiChatLog log = new AiChatLog();
        log.setUserId(userId);
        log.setPlanId(planId);
        log.setConversationType(type);
        log.setCoachRole(coachRole);
        log.setUserMessage(userMessage);
        log.setAiResponse(aiResponse);
        chatLogMapper.insert(log);
    }

    // ========================================================================
    // Streaming Methods
    // ========================================================================

    @Override
    public SseEmitter initPlanCreationStream(Long userId, PlanInitRequest request) {
        SseEmitter emitter = new SseEmitter(120000L);
        log.info("stream request start: endpoint=plan-init, userId={}, sceneKey={}",
                userId, request.getSceneKey());
        if (request.getDirection() == null ||
                (!"BUILD".equalsIgnoreCase(request.getDirection()) && !"QUIT".equalsIgnoreCase(request.getDirection()))) {
            return emitErrorAndComplete(emitter, new IllegalArgumentException("计划方向必须为 BUILD 或 QUIT"));
        }
        if (request.getTopic() == null || request.getTopic().isBlank()) {
            return emitErrorAndComplete(emitter, new IllegalArgumentException("计划主题不能为空"));
        }
        String direction = request.getDirection().toUpperCase();
        String sceneKey = resolvePlanCreationSceneKey(request.getSceneKey(), direction);
        String coachType = resolveCoachTypeForScene(sceneKey, request.getCoachType());
        SysUser user = userMapper.selectById(userId);
        if (user == null) {
            return emitErrorAndComplete(emitter, new IllegalArgumentException("用户不存在"));
        }
        try {
            coachFactory.getStrategy(coachType);
        } catch (IllegalArgumentException e) {
            return emitErrorAndComplete(emitter, new AiServiceException(e.getMessage()));
        }

        String fullSystemPrompt = assembleSystemPrompt(coachType, direction, request.getTopic(), userId, sceneKey);
        String directionLabel = "BUILD".equals(direction) ? "养成习惯" : "戒除习惯";
        String firstUserMessage = "我想建立一个新计划：" + request.getTopic()
                + "。计划方向是" + directionLabel
                + "。如果这些信息已经足够，请直接生成一个初版计划；只有缺少最基本目标时，再问我一个必要问题。";
        String sessionId = UUID.randomUUID().toString();

        PlanSessionData sessionData = new PlanSessionData();
        sessionData.setCoachType(coachType);
        sessionData.setDirection(direction);
        sessionData.setTopic(request.getTopic());
        sessionData.setSceneKey(sceneKey);
        sessionData.setUserId(userId);
        sessionData.getMessages().add(new ChatMessage("system", fullSystemPrompt));
        sessionData.getMessages().add(new ChatMessage("user", firstUserMessage));
        applyUserPreference(sessionData.getMessages(), user);
        createPlanSession(sessionId, sessionData);

        // Send meta with sessionId immediately
        sendSseEvent(emitter, "meta", Map.of("sessionId", sessionId));

        callDeepSeekStreamAndRelay(emitter, userId, sessionData.getMessages(),
                (userId2, fullAiResponse) -> {
                    PlanReadyResult planResult = extractPlanReadyMarker(fullAiResponse);
                    log.info("planReady parsed result: endpoint=plan-init, userId={}, planReady={}",
                            userId2, planResult.planReady());
                    if (planResult.planReady()) {
                        sendSseEvent(emitter, "planReady",
                                Map.of("planReady", true, "planSummary", planResult.planSummary()));
                    }
                    saveChatLog(userId2, null, ConversationType.PLAN_CREATION,
                            buildCoachRole(coachType, sceneKey), firstUserMessage, planResult.cleanedResponse());
                });

        return emitter;
    }

    @Override
    public SseEmitter continuePlanChatStream(Long userId, PlanChatRequest request) {
        SseEmitter emitter = new SseEmitter(120000L);
        log.info("stream request start: endpoint=plan-chat, userId={}, sessionId={}, sceneKey={}",
                userId, request.getSessionId(), request.getSceneKey());
        PlanSessionData session = getPlanSession(request.getSessionId());
        if (session == null) {
            return emitErrorAndComplete(emitter, new IllegalArgumentException("会话已过期，请重新开始"));
        }
        if (!userId.equals(session.getUserId())) {
            return emitErrorAndComplete(emitter, new IllegalArgumentException("会话验证失败"));
        }
        addPlanSessionMessage(request.getSessionId(), new ChatMessage("user", request.getMessage()));
        PlanSessionData updatedSession = getPlanSession(request.getSessionId());
        List<ChatMessage> messages = updatedSession != null ? updatedSession.getMessages() : session.getMessages();
        applyUserPreference(messages, userMapper.selectById(userId));

        String sceneKey = resolvePlanCreationSceneKey(
                request.getSceneKey() != null ? request.getSceneKey() : session.getSceneKey(),
                session.getDirection());
        String coachType = resolveCoachTypeForScene(sceneKey, session.getCoachType());

        callDeepSeekStreamAndRelay(emitter, userId, messages,
                (uid, fullAiResponse) -> {
                    PlanReadyResult planResult = extractPlanReadyMarker(fullAiResponse);
                    log.info("planReady parsed result: endpoint=plan-chat, userId={}, planReady={}",
                            uid, planResult.planReady());
                    addPlanSessionMessage(request.getSessionId(), new ChatMessage("assistant", planResult.cleanedResponse()));
                    if (planResult.planReady()) {
                        sendSseEvent(emitter, "planReady",
                                Map.of("planReady", true, "planSummary", planResult.planSummary()));
                    }
                    saveChatLog(uid, null, ConversationType.PLAN_CREATION,
                            buildCoachRole(coachType, sceneKey), request.getMessage(), planResult.cleanedResponse());
                });

        return emitter;
    }

    @Override
    public SseEmitter coachChatStream(Long userId, CoachChatRequest request) {
        SseEmitter emitter = new SseEmitter(120000L);
        log.info("stream request start: endpoint=coach-chat, userId={}, sceneKey={}",
                userId, request.getSceneKey());
        String sceneKey = resolveCoachChatSceneKey(request.getSceneKey());
        AiScenarioDefinition scene = AI_SCENARIO_MAP.get(sceneKey);
        if (scene == null) {
            return emitErrorAndComplete(emitter, new IllegalArgumentException("无效的 AI 指导师场景"));
        }

        SysUser user = userMapper.selectById(userId);
        String userContext = buildUserContext(user);
        String coachRole = buildCoachRole("COACH_CHAT", sceneKey);
        AiCoachConfig config = coachConfigMapper.findByCoachKey(sceneKey);
        String basePrompt = config != null && config.getSystemPrompt() != null && !config.getSystemPrompt().isBlank()
                ? config.getSystemPrompt()
                : scene.systemPrompt();
        String systemPrompt = basePrompt
                + "\n\n---\n当前身份:\n" + scene.sceneName()
                + "\n场景类别: coach_chat"
                + "\n用户画像:\n" + userContext
                + "\n安全要求:\n" + String.join("；", scene.safetyRules())
                + "\n建议输入:\n" + String.join("；", scene.suggestedUserInputs());

        List<AiChatLog> recentLogs = chatLogMapper.findRecentIndependentByRole(
                userId, ConversationType.INDEPENDENT_CONSULT.getCode(), coachRole, 12);
        if (recentLogs == null) recentLogs = new ArrayList<>();
        Collections.reverse(recentLogs);

        List<ChatMessage> messages = new ArrayList<>();
        messages.add(new ChatMessage("system", systemPrompt));
        applyUserPreference(messages, user);
        for (AiChatLog log : recentLogs) {
            if (log.getUserMessage() != null && !log.getUserMessage().isBlank()) {
                messages.add(new ChatMessage("user", log.getUserMessage()));
            }
            if (log.getAiResponse() != null && !log.getAiResponse().isBlank()) {
                messages.add(new ChatMessage("assistant", log.getAiResponse()));
            }
        }
        messages.add(new ChatMessage("user", request.getMessage()));

        String userMessage = request.getMessage();
        callDeepSeekStreamAndRelay(emitter, userId, messages,
                (uid, fullAiResponse) -> saveChatLog(uid, null, ConversationType.INDEPENDENT_CONSULT,
                        coachRole, userMessage, fullAiResponse));

        return emitter;
    }

    @Override
    public SseEmitter assistChatStream(Long userId, AssistChatRequest request) {
        SseEmitter emitter = new SseEmitter(120000L);
        log.info("stream request start: endpoint=assist-chat, userId={}, planId={}, sceneKey={}",
                userId, request.getPlanId(), request.getSceneKey());
        AiCustomPlan plan = planMapper.selectById(request.getPlanId());
        if (plan == null || !userId.equals(plan.getUserId())) {
            return emitErrorAndComplete(emitter, new IllegalArgumentException("计划不存在"));
        }

        SysUser user = userMapper.selectById(userId);
        String planDirection = plan.getPlanDirection() != null ? plan.getPlanDirection().name() : "";
        String sceneKey = resolveSceneKey(request.getSceneKey(), planDirection);
        String coachType = resolveCoachTypeForScene(sceneKey, plan.getCoachType());
        AiCoachStrategy strategy = coachFactory.getStrategy(coachType);
        String userContext = buildUserContext(user);
        String planContent = plan.getPlanContent() != null ? plan.getPlanContent() : "";
        String targetName = plan.getTargetName() != null ? plan.getTargetName() : "";
        String planContext = "计划内容:" + planContent
                + ", 方向:" + planDirection
                + ", 目标:" + targetName
                + ", 近期记录:" + buildRecentLogContext(plan.getId());
        String systemPrompt = strategy.getSystemPrompt(userContext, planContext)
                + "\n\n---\n当前指导场景:\n" + resolveScenePrompt(sceneKey);

        List<AiChatLog> recentLogs = chatLogMapper.findRecentByPlanId(
                plan.getId(), ConversationType.DAILY_ASSIST.getCode(), 15);
        if (recentLogs == null) recentLogs = new ArrayList<>();
        Collections.reverse(recentLogs);

        List<ChatMessage> messages = new ArrayList<>();
        messages.add(new ChatMessage("system", systemPrompt));
        applyUserPreference(messages, user);
        for (AiChatLog log : recentLogs) {
            messages.add(new ChatMessage("user", log.getUserMessage()));
            messages.add(new ChatMessage("assistant", log.getAiResponse()));
        }
        messages.add(new ChatMessage("user", request.getMessage()));

        String userMessage = request.getMessage();
        callDeepSeekStreamAndRelay(emitter, userId, messages,
                (uid, fullAiResponse) -> saveChatLog(uid, plan.getId(), ConversationType.DAILY_ASSIST,
                        buildCoachRole(coachType, sceneKey), userMessage, fullAiResponse));

        return emitter;
    }

    // ========================================================================
    // Stream helper: call DeepSeek SSE, filter PLAN_READY, relay tokens
    // ========================================================================

    @FunctionalInterface
    private interface StreamCompletionCallback {
        void onComplete(Long userId, String fullAiResponse);
    }

    private void callDeepSeekStreamAndRelay(SseEmitter emitter, Long userId,
                                            List<ChatMessage> messages,
                                            StreamCompletionCallback onComplete) {
        StringBuilder fullResponse = new StringBuilder();
        PlanReadyFilter filter = new PlanReadyFilter(emitter);

        emitter.onCompletion(() -> log.debug("SSE stream completed"));
        emitter.onTimeout(() -> {
            log.warn("SSE stream timeout");
            sendSseEvent(emitter, "error", Map.of("message", "AI 响应超时，请稍后重试"));
            emitter.complete();
        });
        emitter.onError(e -> log.error("SSE stream error: {}", e.getMessage()));

        new Thread(() -> {
            try {
                String full = deepSeekStreamService.streamChat(messages, chunk -> {
                    fullResponse.append(chunk);
                    filter.feed(chunk);
                }, errMsg -> log.warn("Stream chunk parse warning: {}", errMsg));

                filter.flush();
                try {
                    onComplete.onComplete(userId, full);
                } catch (Exception e) {
                    log.error("Stream completion callback failed: {}", e.getMessage());
                    sendSseEvent(emitter, "error", Map.of("message", "AI 回复保存失败，请稍后刷新确认"));
                }
                sendSseEvent(emitter, "done", Map.of("finishReason", "stop"));
                log.info("stream done: userId={}, chars={}", userId, full.length());
                emitter.complete();
            } catch (AiServiceException e) {
                log.error("DeepSeek stream failed: {}", e.getMessage());
                sendSseEvent(emitter, "error", Map.of("message", e.getMessage()));
                emitter.completeWithError(e);
            } catch (Exception e) {
                log.error("Stream unexpected error", e);
                sendSseEvent(emitter, "error", Map.of("message", e.getMessage()));
                emitter.completeWithError(e);
            }
        }, "deepseek-sse-relay").start();
    }

    private SseEmitter emitErrorAndComplete(SseEmitter emitter, Exception e) {
        sendSseEvent(emitter, "error", Map.of("message", e.getMessage()));
        emitter.completeWithError(e);
        return emitter;
    }

    private void sendSseEvent(SseEmitter emitter, String eventName, Object data) {
        try {
            String json = objectMapper.writeValueAsString(data == null ? Map.of() : data);
            emitter.send(SseEmitter.event().name(eventName).data(json));
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize SSE event {}: {}", eventName, e.getMessage());
        } catch (Exception e) {
            log.debug("Failed to send SSE event {}: {}", eventName, e.getMessage());
        }
    }

    /**
     * Filters [PLAN_READY]...[/PLAN_READY] blocks from streaming output.
     * Sends only visible text as token events to the frontend.
     */
    private class PlanReadyFilter {
        private final SseEmitter emitter;
        private final StringBuilder pending = new StringBuilder();
        private boolean inPlanReady = false;

        PlanReadyFilter(SseEmitter emitter) {
            this.emitter = emitter;
        }

        void feed(String chunk) {
            pending.append(chunk);
            while (true) {
                String current = pending.toString();
                if (!inPlanReady) {
                    int idx = current.indexOf("[PLAN_READY]");
                    if (idx >= 0) {
                        String before = current.substring(0, idx);
                        pending.delete(0, idx + "[PLAN_READY]".length());
                        inPlanReady = true;
                        if (!before.isEmpty()) {
                            sendToken(before);
                        }
                        continue;
                    }
                    // Check for partial tag at end
                    String partialPrefix = partialTagPrefix(current);
                    if (partialPrefix.length() > 0) {
                        int keepFrom = current.length() - partialPrefix.length();
                        String safe = current.substring(0, keepFrom);
                        pending.delete(0, keepFrom);
                        if (!safe.isEmpty()) {
                            sendToken(safe);
                        }
                        break;
                    }
                    sendToken(current);
                    pending.setLength(0);
                    break;
                } else {
                    int idx = current.indexOf("[/PLAN_READY]");
                    if (idx >= 0) {
                        pending.delete(0, idx + "[/PLAN_READY]".length());
                        inPlanReady = false;
                        continue;
                    }
                    // Still inside PLAN_READY, consume all but possible end-tag prefix
                    String partialClose = partialClosePrefix(current);
                    if (partialClose.length() > 0) {
                        int keepFrom = current.length() - partialClose.length();
                        pending.delete(0, keepFrom);
                    } else {
                        pending.setLength(0);
                    }
                    break;
                }
            }
        }

        void flush() {
            String remaining = pending.toString();
            if (!remaining.isEmpty() && !inPlanReady) {
                sendToken(remaining);
            }
            pending.setLength(0);
        }

        private void sendToken(String text) {
            sendSseEvent(emitter, "token", Map.of("content", text));
        }

        private static String partialTagPrefix(String s) {
            String tag = "[PLAN_READY]";
            for (int i = Math.min(tag.length() - 1, s.length()); i >= 1; i--) {
                if (tag.startsWith(s.substring(s.length() - i))) return s.substring(s.length() - i);
            }
            return "";
        }

        private static String partialClosePrefix(String s) {
            String tag = "[/PLAN_READY]";
            for (int i = Math.min(tag.length() - 1, s.length()); i >= 1; i--) {
                if (tag.startsWith(s.substring(s.length() - i))) return s.substring(s.length() - i);
            }
            return "";
        }
    }
}
