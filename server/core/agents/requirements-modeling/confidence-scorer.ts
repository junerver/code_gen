/**
 * @Description Confidence Scoring System
 * @Author Claude Code
 * @Date 2025-09-19
 */

import type {
  BusinessModel,
  BusinessEntity,
  EntityRelationship,
  BusinessRule,
  ClarificationQuestion,
} from './types';

export interface ConfidenceScore {
  overall: number;
  factors: {
    entityRecognition: number;
    relationshipClarity: number;
    ruleCompleteness: number;
    ambiguityLevel: number;
    domainMatch: number;
    structuralCompleteness: number;
  };
  explanation?: string[];
  suggestions?: string[];
}

export class ConfidenceScorer {
  private static readonly WEIGHTS = {
    entityRecognition: 0.25,
    relationshipClarity: 0.2,
    ruleCompleteness: 0.2,
    ambiguityLevel: 0.15,
    domainMatch: 0.1,
    structuralCompleteness: 0.1,
  };

  static calculateConfidence(
    text: string,
    entities: BusinessEntity[],
    relationships: EntityRelationship[],
    rules: BusinessRule[],
    clarificationQuestions: ClarificationQuestion[],
    domain: string | null
  ): ConfidenceScore {
    const scores = {
      entityRecognition: this.scoreEntityRecognition(entities),
      relationshipClarity: this.scoreRelationshipClarity(
        relationships,
        entities
      ),
      ruleCompleteness: this.scoreRuleCompleteness(rules),
      ambiguityLevel: this.scoreAmbiguityLevel(text, clarificationQuestions),
      domainMatch: this.scoreDomainMatch(domain),
      structuralCompleteness: this.scoreStructuralCompleteness(
        entities,
        relationships,
        rules
      ),
    };

    const overallScore = this.calculateOverallScore(scores);
    const explanation = this.generateExplanation(scores, overallScore);
    const suggestions = this.generateSuggestions(
      scores,
      clarificationQuestions
    );

    return {
      overall: overallScore,
      factors: scores,
      explanation,
      suggestions,
    };
  }

  private static scoreEntityRecognition(entities: BusinessEntity[]): number {
    if (entities.length === 0) return 0;

    let score = 0;
    const maxScore = entities.length * 100;

    for (const entity of entities) {
      // Check entity name quality
      if (entity.name.length >= 3 && /^[A-Z][a-zA-Z0-9]*$/.test(entity.name)) {
        score += 25;
      }

      // Check description quality
      if (entity.description.length >= 15) {
        score += 25;
      }

      // Check attributes
      if (entity.attributes.length > 0) {
        score += 25;
      }

      // Check for proper attribute definitions
      const hasGoodAttributes = entity.attributes.every(
        attr => attr.name.length >= 2 && attr.description.length >= 5
      );
      if (hasGoodAttributes) {
        score += 25;
      }
    }

    return Math.min(score / maxScore, 1);
  }

  private static scoreRelationshipClarity(
    relationships: EntityRelationship[],
    entities: BusinessEntity[]
  ): number {
    if (relationships.length === 0) return 0.3; // Some relationships expected

    let score = 0;
    const entityNames = new Set(entities.map(e => e.name));

    for (const relationship of relationships) {
      // Check if entities exist
      if (
        entityNames.has(relationship.from) &&
        entityNames.has(relationship.to)
      ) {
        score += 40;
      }

      // Check description quality
      if (relationship.description.length >= 10) {
        score += 30;
      }

      // Check relationship type clarity
      if (
        ['one-to-one', 'one-to-many', 'many-to-many'].includes(
          relationship.type
        )
      ) {
        score += 30;
      }
    }

    return Math.min(score / (relationships.length * 100), 1);
  }

  private static scoreRuleCompleteness(rules: BusinessRule[]): number {
    if (rules.length === 0) return 0.2; // Some rules expected

    let score = 0;

    for (const rule of rules) {
      // Check rule description quality
      if (rule.rule.length >= 15) {
        score += 40;
      }

      // Check priority assignment
      if (rule.priority) {
        score += 20;
      }

      // Check category assignment
      if (rule.category) {
        score += 20;
      }

      // Check for complete rule structure
      if (rule.conditions && rule.actions) {
        score += 20;
      }
    }

    return Math.min(score / (rules.length * 100), 1);
  }

  private static scoreAmbiguityLevel(
    text: string,
    clarificationQuestions: ClarificationQuestion[]
  ): number {
    // Higher score means LESS ambiguity
    let score = 100;

    // Check for ambiguous keywords
    const ambiguousWords = [
      '可能',
      '大概',
      '也许',
      '或者',
      '等等',
      '某些',
      '一些',
    ];
    const ambiguousCount = ambiguousWords.filter(word =>
      text.includes(word)
    ).length;
    score -= ambiguousCount * 10;

    // Check for vague terms
    const vagueTerms = ['功能', '系统', '管理', '处理', '操作'];
    const vagueCount = vagueTerms.filter(term => text.includes(term)).length;
    score -= vagueCount * 5;

    // Check for specific technical terms
    const technicalTerms = [
      'API',
      '数据库',
      '接口',
      '字段',
      '表',
      '模型',
      '控制器',
    ];
    const technicalCount = technicalTerms.filter(term =>
      text.includes(term)
    ).length;
    score += technicalCount * 5;

    // Check clarification questions
    score -= clarificationQuestions.length * 15;

    return Math.max(Math.min(score / 100, 1), 0);
  }

  private static scoreDomainMatch(domain: string | null): number {
    return domain ? 1.0 : 0.5;
  }

  private static scoreStructuralCompleteness(
    entities: BusinessEntity[],
    relationships: EntityRelationship[],
    rules: BusinessRule[]
  ): number {
    let score = 0;

    // Check entity diversity
    const entityTypes = new Set(entities.map(e => e.type));
    if (entityTypes.size >= 2) score += 30;

    // Check relationship diversity
    const relationshipTypes = new Set(relationships.map(r => r.type));
    if (relationshipTypes.size >= 2) score += 30;

    // Check rule diversity
    const ruleCategories = new Set(rules.map(r => r.category));
    if (ruleCategories.size >= 2) score += 40;

    return score / 100;
  }

  private static calculateOverallScore(
    scores: ConfidenceScore['factors']
  ): number {
    const { WEIGHTS } = ConfidenceScorer;

    return (
      Math.round(
        (scores.entityRecognition * WEIGHTS.entityRecognition +
          scores.relationshipClarity * WEIGHTS.relationshipClarity +
          scores.ruleCompleteness * WEIGHTS.ruleCompleteness +
          scores.ambiguityLevel * WEIGHTS.ambiguityLevel +
          scores.domainMatch * WEIGHTS.domainMatch +
          scores.structuralCompleteness * WEIGHTS.structuralCompleteness) *
          100
      ) / 100
    );
  }

  private static generateExplanation(
    scores: ConfidenceScore['factors'],
    overallScore: number
  ): string[] {
    const explanations: string[] = [];
    explanations.push(`Overall confidence: ${Math.round(overallScore * 100)}%`);

    if (scores.entityRecognition < 0.7) {
      explanations.push(
        'Entity recognition needs improvement - some entities lack proper structure or description'
      );
    }

    if (scores.relationshipClarity < 0.7) {
      explanations.push(
        'Relationship clarity is low - consider defining more explicit connections between entities'
      );
    }

    if (scores.ruleCompleteness < 0.7) {
      explanations.push(
        'Business rules are incomplete - more detailed rules and constraints needed'
      );
    }

    if (scores.ambiguityLevel < 0.7) {
      explanations.push(
        'High ambiguity detected - the original text contains vague or unclear requirements'
      );
    }

    if (scores.domainMatch < 1.0) {
      explanations.push(
        'Domain could not be identified - more specific domain terminology might help'
      );
    }

    return explanations;
  }

  private static generateSuggestions(
    scores: ConfidenceScore['factors'],
    clarificationQuestions: ClarificationQuestion[]
  ): string[] {
    const suggestions: string[] = [];

    if (scores.entityRecognition < 0.7) {
      suggestions.push(
        'Provide more detailed descriptions for each identified entity'
      );
      suggestions.push(
        'Define all necessary attributes with proper types and constraints'
      );
    }

    if (scores.relationshipClarity < 0.7) {
      suggestions.push('Clarify the relationships between different entities');
      suggestions.push(
        'Specify relationship types (one-to-many, many-to-many, etc.)'
      );
    }

    if (scores.ruleCompleteness < 0.7) {
      suggestions.push('Define specific business rules and constraints');
      suggestions.push('Clarify validation rules for each entity');
    }

    if (scores.ambiguityLevel < 0.7) {
      suggestions.push('Use more specific and technical terminology');
      suggestions.push('Avoid vague terms like "some", "certain", "etc."');
    }

    if (clarificationQuestions.length > 0) {
      suggestions.push(
        `Answer the ${clarificationQuestions.length} clarification questions to improve accuracy`
      );
    }

    return suggestions;
  }
}
