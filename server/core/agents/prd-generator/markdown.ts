import type { PrdDocument } from './schema';

const joinLines = (lines: string[]) => lines.filter(Boolean).join('\n');

const renderBulletList = (items: string[], indent = 0) => {
  if (!items?.length) return '';
  const prefix = ' '.repeat(indent);
  return items.map(item => `${prefix}- ${item}`).join('\n');
};

const renderNumberedList = (items: string[]) =>
  items.map((item, index) => `${index + 1}. ${item}`).join('\n');

const renderTable = (rows: Array<Record<string, string>>) => {
  if (!rows?.length) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows
    .map(row => `| ${headers.map(key => row[key] ?? '').join(' | ')} |`)
    .join('\n');
  return [headerLine, separator, body].join('\n');
};

const renderWorkflowSection = (prd: PrdDocument) =>
  prd.workflows
    .map(workflow => {
      const blocks: string[] = [];
      blocks.push(`### ${workflow.name}`);
      blocks.push(`${workflow.overview}`);
      blocks.push('**主流程：**');
      blocks.push(renderNumberedList(workflow.steps));
      if (workflow.alternatePaths?.length) {
        blocks.push('**备选流程 / 异常路径：**');
        blocks.push(renderBulletList(workflow.alternatePaths));
      }
      if (workflow.artifacts?.length) {
        blocks.push('**产出物：**');
        blocks.push(renderBulletList(workflow.artifacts));
      }
      if (workflow.notes?.length) {
        blocks.push('**补充说明：**');
        blocks.push(renderBulletList(workflow.notes));
      }
      return blocks.join('\n\n');
    })
    .join('\n\n');

const renderFeatureSection = (prd: PrdDocument) =>
  prd.features
    .map(feature => {
      const sections: string[] = [];
      sections.push(`### ${feature.name} (${feature.priority})`);
      sections.push(feature.description);
      sections.push(`- 触发条件：${feature.trigger}`);
      sections.push(`- 前置条件：${feature.preconditions}`);
      sections.push('**主要流程**');
      sections.push(renderNumberedList(feature.mainFlow));
      if (feature.alternateFlows?.length) {
        sections.push('**备选流程**');
        sections.push(renderNumberedList(feature.alternateFlows));
      }
      sections.push(`- 后置条件：${feature.postconditions}`);
      sections.push('**异常处理**');
      sections.push(renderBulletList(feature.exceptions));
      if (feature.dependencies?.length) {
        sections.push('**依赖项**');
        sections.push(renderBulletList(feature.dependencies));
      }
      if (feature.dataNeeds?.length) {
        sections.push('**数据需求**');
        sections.push(renderBulletList(feature.dataNeeds));
      }
      if (feature.notes?.length) {
        sections.push('**备注**');
        sections.push(renderBulletList(feature.notes));
      }
      if (feature.clarifications?.length) {
        sections.push('**待确认/澄清**');
        sections.push(renderBulletList(feature.clarifications));
      }
      return sections.join('\n\n');
    })
    .join('\n\n');

const renderPersonaTable = (prd: PrdDocument) => {
  const rows = prd.personas.map(persona => ({
    角色: persona.name,
    描述: persona.description,
    职责: persona.responsibilities.join('；'),
    痛点: persona.painPoints.join('；'),
  }));
  return renderTable(rows);
};

const renderGoalTable = (prd: PrdDocument) => {
  const rows = prd.goals.map(goal => ({
    目标: goal.goal,
    优先级: goal.priority,
    成功度量: goal.successMetric,
  }));
  return renderTable(rows);
};

const renderStakeholders = (prd: PrdDocument) =>
  prd.metadata.stakeholders?.length
    ? renderBulletList(prd.metadata.stakeholders)
    : '';

const renderDataTable = (prd: PrdDocument) => {
  const rows = prd.dataDictionary.map(item => ({
    字段: item.name,
    展示名: item.label,
    类型: item.type,
    必填: item.required ? '是' : '否',
    描述: item.description,
    示例: item.example,
    约束: item.constraints ?? '—',
  }));
  return renderTable(rows);
};

const renderNonFunctionalTable = (prd: PrdDocument) => {
  const rows = prd.nonFunctionalRequirements.map(item => ({
    类型: item.category,
    描述: item.statement,
    指标: item.metric,
    优先级: item.priority,
  }));
  return renderTable(rows);
};

const renderExceptionTable = (prd: PrdDocument) => {
  const rows = prd.exceptionScenarios.map(item => ({
    异常场景: item.scenario,
    处理方案: item.handling,
    优先级: item.priority,
    监测: item.detection ?? '—',
  }));
  return renderTable(rows);
};

const renderRiskTable = (prd: PrdDocument) => {
  const rows = prd.risks.map(item => ({
    风险: item.risk,
    发生概率: item.likelihood,
    影响程度: item.impact,
    缓解措施: item.mitigation,
  }));
  return renderTable(rows);
};

const renderAcceptanceSection = (prd: PrdDocument) =>
  prd.acceptanceCriteria
    .map(block => {
      const lines: string[] = [`### ${block.feature}`];
      block.criteria.forEach(criteria => {
        lines.push(`- **${criteria.label}** ${criteria.scenario}`);
        lines.push(
          `  - Given ${criteria.given}\n  - When ${criteria.when}\n  - Then ${criteria.then}`
        );
      });
      return lines.join('\n');
    })
    .join('\n\n');

const renderGlossary = (prd: PrdDocument) => {
  if (!prd.glossary?.length) return '';
  const rows = prd.glossary.map(entry => ({
    术语: entry.term,
    定义: entry.definition,
  }));
  return renderTable(rows);
};

const renderOutstanding = (prd: PrdDocument) =>
  prd.outstandingQuestions?.length
    ? renderBulletList(prd.outstandingQuestions)
    : '';

const buildToc = (sections: string[]) => {
  return sections.map(section => `- [${section}](#${section})`).join('\n');
};

export const prdToMarkdown = (prd: PrdDocument): string => {
  const sections: string[] = [];
  const topTitle = `# ${prd.metadata.title} 产品需求文档（PRD）`;
  const metaLines = [
    `【版本 ${prd.metadata.version}】  `,
    `最后更新：${prd.metadata.lastUpdated}`,
  ];
  const summary = prd.metadata.summary;

  const tocTitles = [
    '需求背景',
    '业务目标',
    '用户角色与人物画像',
    '功能需求',
    '业务流程',
    '数据需求',
    '非功能需求',
    '异常场景与边界条件',
    '风险与缓解策略',
    '验收标准',
  ];
  if (prd.metadata.stakeholders?.length) {
    tocTitles.splice(1, 0, '关键干系人');
  }
  if (prd.glossary?.length) {
    tocTitles.push('术语表');
  }
  if (prd.outstandingQuestions?.length) {
    tocTitles.push('开放问题与待确认项');
  }

  const toc = buildToc(tocTitles);

  sections.push(topTitle);
  sections.push(metaLines.join('\n'));
  sections.push(summary);
  sections.push('## 目录');
  sections.push(toc);
  sections.push('## 需求背景');
  sections.push(prd.background.businessContext);
  sections.push('**目标用户与需求：**');
  sections.push(
    prd.background.targetUsers
      .map(
        user =>
          `- ${user.name}：${user.description}\n  - 关键需求：${user.primaryNeeds.join('；')}`
      )
      .join('\n')
  );
  sections.push('**主要使用场景：**');
  sections.push(renderBulletList(prd.background.usageScenarios));

  if (prd.metadata.stakeholders?.length) {
    sections.push('## 关键干系人');
    sections.push(renderStakeholders(prd) ?? '');
  }

  sections.push('## 业务目标');
  sections.push(renderGoalTable(prd));

  sections.push('## 用户角色与人物画像');
  sections.push(renderPersonaTable(prd));

  sections.push('## 功能需求');
  sections.push(renderFeatureSection(prd));

  sections.push('## 业务流程');
  sections.push(renderWorkflowSection(prd));

  sections.push('## 数据需求');
  sections.push('**范围说明：**');
  sections.push(renderBulletList(prd.metadata.scope.inScope));
  if (prd.metadata.scope.outOfScope?.length) {
    sections.push('**不在范围内：**');
    sections.push(renderBulletList(prd.metadata.scope.outOfScope));
  }
  sections.push(renderDataTable(prd));

  sections.push('## 非功能需求');
  sections.push(renderNonFunctionalTable(prd));

  sections.push('## 异常场景与边界条件');
  sections.push(renderExceptionTable(prd));

  sections.push('## 风险与缓解策略');
  sections.push(renderRiskTable(prd));

  sections.push('## 验收标准');
  sections.push(renderAcceptanceSection(prd));

  if (prd.glossary?.length) {
    sections.push('## 术语表');
    sections.push(renderGlossary(prd));
  }

  if (prd.outstandingQuestions?.length) {
    sections.push('## 开放问题与待确认项');
    sections.push(renderOutstanding(prd));
  }

  return joinLines(sections) + '\n';
};
