import {
  requirementInsightsSchema,
  type RequirementInsights,
} from './insights';
import { prdSchema, type PrdDocument } from './schema';

const pickFeaturePriority = (index: number): '核心' | '重要' | '可选' => {
  if (index === 0) return '核心';
  if (index === 1) return '重要';
  return '可选';
};

const pickRiskLevel = (index: number): '高' | '中' | '低' => {
  if (index === 0) return '高';
  if (index === 1) return '中';
  return '低';
};

const pickAcceptanceLabel = (index: number): '必须' | '应该' | '可以' => {
  if (index === 0) return '必须';
  if (index === 1) return '应该';
  return '可以';
};

const ensureMinLength = (
  value: string | undefined,
  min: number,
  fallback: string
) => {
  let result = (value ?? '').trim();
  if (!result) {
    result = fallback;
  }
  while (result.length < min) {
    result += ` ${fallback}`;
  }
  return result;
};

const sentence = (text: string) =>
  text.endsWith('。') || text.endsWith('.') ? text : `${text}。`;

const buildBusinessContext = (
  insights: RequirementInsights,
  requirementText: string
) => {
  const base = `${insights.elevatorPitch} 产品定位于${insights.strategicPositioning[0]}，旨在解决用户在日常业务中遇到的核心痛点。`;
  const extended = `当前需求来源于“${requirementText.slice(0, 40)}”，团队希望通过阶段性交付迅速验证价值，并为后续扩展打下基础。`;
  return ensureMinLength(
    `${sentence(base)}${sentence(extended)}`,
    40,
    '该产品提供端到端的流程支持，并强调可持续迭代。'
  );
};

const buildTargetUsers = (insights: RequirementInsights) => {
  return insights.primaryUsers.map(user => ({
    name: user.label,
    description: ensureMinLength(
      `${user.description} 他们希望通过系统获得更高的执行效率，并减少沟通成本。`,
      30,
      '该用户群体需要借助数字化工具稳定管理核心业务流程'
    ),
    primaryNeeds: user.topJobsToBeDone
      .map(job => ensureMinLength(job, 6, '需要可视化掌握整体任务进度与优先级'))
      .slice(0, 4),
  }));
};

const buildUsageScenarios = (insights: RequirementInsights) => {
  const scenarios: string[] = [];
  insights.keyFeatures.slice(0, 2).forEach(feature => {
    scenarios.push(
      ensureMinLength(
        `当用户需要${feature.name}时，系统引导他们依次完成关键步骤，确保业务流程不会遗漏重要节点。`,
        20,
        '用户在移动端快速提交需求并同步给团队成员跟进'
      )
    );
  });
  while (scenarios.length < 2) {
    scenarios.push(
      '用户通过系统统一查看任务状态，按优先级安排当天工作，并将异常情况及时记录。'
    );
  }
  return scenarios;
};

const buildGoals = (insights: RequirementInsights) => {
  const goals = insights.strategicPositioning
    .slice(0, 3)
    .map((position, index) => ({
      goal: ensureMinLength(
        `强化${position}，让核心用户在关键场景下获得稳定体验`,
        15,
        '持续提升产品在核心业务场景下的可用性'
      ),
      priority: pickRiskLevel(index),
      successMetric: ensureMinLength(
        insights.successMetrics[index] ??
          '上线三个月内相关功能的周活跃率保持在 70% 以上',
        10,
        '上线三个月内核心功能的周活跃率保持在 70% 以上'
      ),
    }));
  while (goals.length < 3) {
    goals.push({
      goal: '提升整体运营效率，使团队能够快速响应业务调整和客户反馈',
      priority: '中',
      successMetric:
        '产品上线后，需求响应周期缩短 30%，关键流程满意度达到 4.5 分',
    });
  }
  return goals;
};

const buildPersonas = (insights: RequirementInsights) => {
  const primary = insights.primaryUsers[0];
  const description = ensureMinLength(
    `${primary.description} 他/她在日常工作中承担沟通协调与任务跟进职责，需要通过工具掌控整体节奏并及时发现阻塞点。`,
    50,
    '该人物角色负责跨团队的需求推进，需要平衡效率、质量与风险，并保持与干系人的持续沟通。'
  );

  const responsibilities = [
    '规划和跟踪日常任务进度，定期向团队同步状态',
    '协调跨职能团队资源，推动关键里程碑按期达成',
    '监控风险点并及时提出缓解策略',
  ];

  const painPoints = [
    '现有流程缺乏统一视图，难以及时掌握整体进展',
    '任务信息分散在多种渠道，导致沟通成本高且易遗漏',
    '缺少数据支撑的优先级判断方式，决策耗时',
  ];

  return [
    {
      name: primary.label,
      description,
      responsibilities,
      painPoints,
    },
  ];
};

const buildFeature = (
  feature: RequirementInsights['keyFeatures'][number],
  index: number
) => {
  const priority = pickFeaturePriority(index);
  const description = ensureMinLength(
    `${feature.objective} ${feature.userValue}`,
    40,
    '该功能围绕核心流程设计，支持用户快速完成关键操作并获得明确反馈'
  );
  const trigger =
    '当用户需要处理相关业务或任务时，系统提供入口并提示所需信息。';
  const preconditions =
    '用户已登录系统并具备访问权限，相关基础数据已同步完成。';
  const postconditions = `系统完成 ${feature.name} 所需的数据写入与状态更新，界面实时反馈结果。`;
  const exceptions = [
    '若网络请求失败，系统提示用户稍后重试并记录失败原因以便排查。',
    '若缺少必要的业务数据，系统引导用户补充或联系管理员处理。',
  ];
  const dependencies = [
    '用户账户与权限服务',
    '消息通知与提醒组件',
    '数据存储与审计日志模块',
  ];
  const dataNeeds = [
    `${feature.name} 操作相关的时间、操作者、目标对象与状态变更信息`,
    '与业务对象的关联标识以及溯源所需的上下文数据',
  ];
  const alternateFlows = [
    `当用户需要修改已提交的 ${feature.name} 请求时，系统提供编辑入口并重新校验数据。`,
  ];
  const notes = [
    '在设计交互细节时需兼顾桌面端与移动端体验，避免操作路径过长。',
  ];
  const clarifications = [
    '待确认：是否需要对不同角色设置差异化可见范围与审批流程',
  ];

  const mainFlow = feature.mainSteps.map((step, idx) => {
    const normalized = ensureMinLength(
      step,
      6,
      '系统提示用户完成必要的表单填写与确认'
    );
    return `${idx + 1}. ${normalized}`;
  });

  while (mainFlow.length < 5) {
    mainFlow.push(
      `${mainFlow.length + 1}. 系统自动校验数据并在前端展示校验结果供用户确认。`
    );
  }

  return {
    name: feature.name,
    priority,
    description,
    trigger,
    preconditions,
    mainFlow,
    alternateFlows,
    postconditions,
    exceptions,
    dependencies,
    dataNeeds,
    notes,
    clarifications,
  };
};

const buildFeatures = (insights: RequirementInsights) => {
  const features = insights.keyFeatures.map(buildFeature);
  while (features.length < 3) {
    features.push(
      buildFeature(
        {
          name: `扩展能力-${features.length + 1}`,
          objective: '支持业务团队快速上线新的流程配置，减少开发依赖',
          userValue: '让运营同学能够自助管理流程版本并进行灰度验证',
          successSignals: [
            '运营团队可在 30 分钟内完成配置并投入试运行',
            '流程变更的反馈周期控制在 2 天内',
          ],
          mainSteps: [
            '运营同学进入流程配置模块并选择需要调整的模板',
            '系统展示当前配置内容并提供可视化编辑能力',
            '用户调整表单字段、节点权限以及通知策略',
            '系统执行规则校验并提示潜在冲突或依赖',
            '用户提交变更请求，系统生成版本并等待审批',
          ],
        },
        features.length
      )
    );
  }
  return features;
};

const buildWorkflows = (features: PrdDocument['features']) => {
  const primarySteps = features.flatMap(feature =>
    feature.mainFlow.slice(0, 3)
  );
  const coreFlow = [
    '用户登录系统并查看面板中的重点待办事项',
    '用户按照优先级选择需要处理的任务进入详情页面',
    '系统展示任务背景、关联信息和操作记录供用户确认',
    primarySteps[0] ?? '用户执行核心操作并提交结果，系统实时反馈成功提示',
    primarySteps[1] ?? '系统同步通知相关干系人并记录审计日志',
    primarySteps[2] ?? '用户核对业务数据并回到列表处理下一项任务',
    '系统每晚进行数据归档与指标计算，保障统计准确性',
    '管理者在周会中复盘关键指标并针对瓶颈制定改进计划',
  ];

  const exceptionFlow = [
    '系统监控到请求失败或延迟异常时触发报警',
    '值班人员收到通知后检查服务状态与日志信息',
    '若为短暂抖动，系统自动重试并在前端提示稍后刷新',
    '若为持续异常，运维团队会启用降级策略保障核心流程可用',
    '待问题恢复后，系统回放失败请求并生成差异报告',
    '团队复盘事故并整理改进方案纳入后续迭代计划',
    '产品经理同步受影响范围并在周报中说明处理结果',
    '相关指标在监控大屏中标记异常区间供审计查阅',
  ];

  return [
    {
      name: '核心任务处理流程',
      overview:
        '描述用户从登录系统到完成主要任务的端到端流程，确保每个环节都有明确的责任与反馈。',
      steps: coreFlow,
      alternatePaths: [
        '若任务涉及跨部门协作，系统自动抛送消息到对应团队并标记跟进人。',
      ],
      artifacts: ['任务执行日志', '操作轨迹审计报告'],
      notes: [
        '建议结合实际部署环境，评估流程中每个环节的 SLA 要求并进行配置。',
      ],
    },
    {
      name: '异常恢复与复盘流程',
      overview:
        '描述当系统出现异常或用户反馈问题时的发现、处理、沟通与复盘机制，保障业务连续性。',
      steps: exceptionFlow,
      alternatePaths: [
        '当自动化修复失败时，系统会引导值班人员切换到人工处理模式。',
      ],
      artifacts: ['事故通报模板', '问题复盘报告'],
      notes: ['建议建立例行演练计划，确保团队熟悉异常处理步骤并缩短恢复时间。'],
    },
  ];
};

const DATA_DICTIONARY_TEMPLATE = [
  {
    name: 'taskId',
    label: '任务编号',
    type: '字符串',
    required: true,
    description: '系统为每个任务生成的唯一标识符，用于关联操作记录与审计日志。',
    example: 'TASK-202406-001',
    constraints: '需保持全局唯一，建议使用雪花算法或 UUID。',
    source: '任务创建服务',
  },
  {
    name: 'taskTitle',
    label: '任务标题',
    type: '字符串',
    required: true,
    description: '由用户填写的任务名称，用于快速识别任务核心内容。',
    example: '整理本周需求评审资料',
  },
  {
    name: 'taskDescription',
    label: '任务描述',
    type: '字符串',
    required: false,
    description: '任务的补充说明，记录操作背景、期望结果和参考资料链接等信息。',
    example: '汇总待评审需求，整理关键输入并完成 PPT 初稿。',
  },
  {
    name: 'assigneeId',
    label: '执行人标识',
    type: '字符串',
    required: true,
    description: '任务当前负责人的用户唯一标识，用于权限校验与消息通知。',
    example: 'USER-98231',
  },
  {
    name: 'priority',
    label: '优先级',
    type: '字符串',
    required: true,
    description: '任务优先级枚举值，可取高/中/低，决定处理顺序与提醒频率。',
    example: '高优先级',
    constraints: '系统校验仅允许高、中、低三种取值。',
  },
  {
    name: 'status',
    label: '状态',
    type: '字符串',
    required: true,
    description: '任务当前状态，如待处理、进行中、已完成、已搁置等。',
    example: '进行中',
  },
  {
    name: 'createdAt',
    label: '创建时间',
    type: '日期时间',
    required: true,
    description: '任务首次创建的时间戳，用于统计新增任务与 SLA。',
    example: '2024-06-10T09:30:00Z',
  },
  {
    name: 'updatedAt',
    label: '更新时间',
    type: '日期时间',
    required: true,
    description: '任务最后一次更新的时间戳，用于识别长期未处理的事项。',
    example: '2024-06-12T15:45:00Z',
  },
  {
    name: 'completedAt',
    label: '完成时间',
    type: '日期时间',
    required: false,
    description: '任务标记完成时的时间戳，便于后续统计完成效率与趋势。',
    example: '2024-06-13T08:20:00Z',
  },
  {
    name: 'remark',
    label: '备注信息',
    type: '字符串',
    required: false,
    description: '额外的补充说明，如外部链接、审批意见或协作提醒等内容。',
    example: '需同步法务确认合同条款，计划 6 月 15 日完成审批。',
  },
];

const buildNonFunctionalRequirements = () => [
  {
    category: '性能',
    statement: '系统在并发 1000 用户访问情况下仍需保持核心接口的稳定响应能力。',
    metric: '核心接口 P95 响应时间 < 800ms，错误率 < 0.2%',
    priority: '高',
  },
  {
    category: '可用性',
    statement: '界面需要提供清晰的流程引导与错误提示，提升用户首次使用成功率。',
    metric: '关键操作任务的成功率 ≥ 95%，用户满意度 ≥ 4.5 分',
    priority: '中',
  },
  {
    category: '安全性',
    statement:
      '确保数据存储与传输符合企业级安全标准，关键操作需具备审计追踪能力。',
    metric: '通过渗透测试并符合公司安全审计标准，重要操作 100% 记录审计日志',
    priority: '高',
  },
  {
    category: '兼容性',
    statement: '系统需兼容主流浏览器与移动设备，保障团队成员多场景访问。',
    metric:
      'Chrome/Safari/Edge 最新两个版本适配通过，移动端覆盖 iOS/Android 主流分辨率',
    priority: '中',
  },
  {
    category: '可维护性',
    statement: '代码结构模块化，便于新成员快速上手并降低功能迭代引入的风险。',
    metric: '核心模块单元测试覆盖率 ≥ 80%，重要流程具备端到端自动化测试',
    priority: '中',
  },
];

const buildExceptionScenarios = () => [
  {
    scenario: '用户在高峰期批量提交任务导致部分请求超时或失败。',
    handling:
      '系统自动排队重试，并在前端提示处理进度，必要时支持导出失败清单供人工处理。',
    priority: '高',
    detection: '监控队列长度与接口超时率，超过阈值触发告警。',
  },
  {
    scenario: '用户误删关键任务或修改了重要字段导致信息缺失。',
    handling: '提供回收站与历史版本恢复功能，操作前进行二次确认并通知管理员。',
    priority: '中',
    detection: '关键删除操作写入审计日志并推送到安全审计频道。',
  },
  {
    scenario: '系统升级期间出现数据迁移失败或字段兼容性问题。',
    handling: '在部署前执行影子发布与回滚预案，异常时立即回退并同步运维团队。',
    priority: '高',
    detection: 'CI/CD 管道在迁移脚本执行后校验数据量与对账结果。',
  },
  {
    scenario: '第三方接口不可用导致任务同步或消息通知中断。',
    handling:
      '启用熔断与降级策略，缓存请求并在恢复后补发，必要时通知人工处理。',
    priority: '中',
    detection: '监控第三方调用失败率，并在出现连续异常时触发警报。',
  },
  {
    scenario: '权限配置错误导致敏感信息被非目标用户访问。',
    handling: '限制敏感字段展示，开启行级权限校验，并建立权限审批流程。',
    priority: '高',
    detection: '安全审计系统分析访问日志并输出异常访问报告。',
  },
];

const buildRisks = (criticalRisks: string[]) => {
  const defaults = [
    '上线初期用户参与度不足，无法收集到足够的反馈验证产品假设。',
    '团队资源紧张，多项目并行可能导致排期延误与质量不可控。',
    '涉及跨系统数据对接，如接口协议不清晰会影响整体稳定性。',
  ];
  const combined = [...criticalRisks, ...defaults];
  return combined.slice(0, 3).map((risk, index) => ({
    risk: ensureMinLength(
      risk,
      15,
      '需要进一步验证的业务或技术风险尚未完全识别，请补充评估。'
    ),
    likelihood: pickRiskLevel(index),
    impact: index === 0 ? '高' : index === 1 ? '中' : '低',
    mitigation:
      index === 0
        ? '制定完整的用户拉新与培育计划，持续跟进核心指标并及时调整方案。'
        : index === 1
          ? '采用里程碑管理方式，关键节点设定质量门禁并预留缓冲时间。'
          : '提前明确数据接口协议，建立联调验收清单和回滚脚本。',
    owner: index === 0 ? '产品经理' : index === 1 ? '项目经理' : '技术负责人',
  }));
};

const buildAcceptanceCriteria = (features: PrdDocument['features']) => {
  return features.slice(0, 3).map((feature, index) => {
    const criteria = [
      {
        label: pickAcceptanceLabel(0),
        scenario: `${feature.name} 功能流程完整可用`,
        given: 'Given 用户已成功登录并拥有功能访问权限',
        when: `When 用户按照指引完成 ${feature.name} 的核心步骤`,
        then: 'Then 系统保存数据且界面反馈操作成功，同时相关干系人收到通知',
      },
      {
        label: pickAcceptanceLabel(1),
        scenario: `${feature.name} 功能具备异常处理能力`,
        given: 'Given 系统检测到依赖的服务暂时不可用',
        when: `When 用户再次尝试或等待系统自动重试 ${feature.name} 操作`,
        then: 'Then 平台记录重试结果并在恢复后自动补偿，用户获得清晰的处理状态',
      },
    ];
    if (index === 0) {
      criteria.push({
        label: pickAcceptanceLabel(2),
        scenario: `${feature.name} 支持多端协同`,
        given: 'Given 用户在桌面端开启任务处理流程',
        when: 'When 用户在移动端继续操作并提交结果',
        then: 'Then 数据保持一致，相关统计指标实时更新并在仪表盘展示',
      });
    }
    return {
      feature: feature.name,
      criteria,
    };
  });
};

const buildGlossary = (features: PrdDocument['features']) => [
  {
    term: '任务生命周期',
    definition: '指任务从创建、执行、完成到归档的全流程状态变化与治理策略。',
  },
  {
    term: 'SLA 指标',
    definition:
      'Service Level Agreement，指针对系统响应和恢复时间制定的可量化承诺。',
  },
  {
    term: `${features[0]?.name ?? '核心功能'}`,
    definition: `${features[0]?.name ?? '该功能'} 是本产品的关键能力，用于支撑用户日常高频操作，确保业务流程顺畅。`,
  },
];

const buildOutstanding = (openQuestions: string[]) => {
  const defaults = [
    '【待确认】是否需要与现有系统做实时数据同步，以及同步的频率与安全策略。',
    '【待确认】后续版本是否计划引入自动化提醒或智能推荐，以进一步提升效率。',
  ];
  const merged = [...openQuestions.map(q => `【待确认】${q}`), ...defaults];
  return merged.slice(0, 4);
};

export const buildPrdFromInsights = (
  rawInsights: unknown,
  requirementText: string,
  includeGlossary: boolean
): PrdDocument => {
  const insights = requirementInsightsSchema.parse(rawInsights);

  const metadata = {
    title: ensureMinLength(insights.productTitle, 5, '产品需求文档'),
    version: '1.0',
    lastUpdated: new Date().toISOString().slice(0, 10),
    summary: ensureMinLength(
      `${insights.elevatorPitch} 该版本聚焦于验证核心价值并为扩展能力预留架构空间。`,
      30,
      '该产品旨在提升团队协作效率，通过结构化流程与数据化决策支撑业务增长。'
    ),
    stakeholders: ['产品经理', '研发负责人', '测试团队', '运营团队'],
    assumptions: insights.operationalConstraints
      .slice(0, 10)
      .map(constraint =>
        ensureMinLength(constraint, 10, '默认假设团队具备必要的系统接入能力。')
      ),
    scope: {
      inScope: insights.keyFeatures
        .map(
          feature => `交付「${feature.name}」相关的端到端流程与可视化数据能力。`
        )
        .slice(0, 4),
      outOfScope: [
        '深度 BI 分析与跨组织自动化流程在后续版本规划，不在本期范围。',
        '复杂权限审批矩阵以及第三方生态对接暂不纳入当前迭代。',
      ],
    },
    successMetrics: insights.successMetrics.map(metric =>
      ensureMinLength(
        metric,
        10,
        '上线三个月内核心活跃用户数增长 30%，任务完成率达到 85%。'
      )
    ),
  };

  const background = {
    businessContext: buildBusinessContext(insights, requirementText),
    targetUsers: buildTargetUsers(insights),
    usageScenarios: buildUsageScenarios(insights),
  };

  const features = buildFeatures(insights);
  const workflows = buildWorkflows(features);

  const prd: PrdDocument = {
    metadata,
    background,
    goals: buildGoals(insights),
    personas: buildPersonas(insights),
    features,
    workflows,
    dataDictionary: DATA_DICTIONARY_TEMPLATE,
    nonFunctionalRequirements: buildNonFunctionalRequirements(),
    exceptionScenarios: buildExceptionScenarios(),
    risks: buildRisks(insights.criticalRisks),
    acceptanceCriteria: buildAcceptanceCriteria(features),
    glossary: includeGlossary ? buildGlossary(features) : undefined,
    outstandingQuestions: buildOutstanding(insights.openQuestions),
  };

  return prdSchema.parse(prd);
};
