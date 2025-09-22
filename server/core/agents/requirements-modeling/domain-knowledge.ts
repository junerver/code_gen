/**
 * @Description Domain Knowledge Base
 * @Author Claude Code
 * @Date 2025-09-19
 */

import type { DomainKnowledge } from './types';

export const DOMAIN_KNOWLEDGE_BASE: Record<string, DomainKnowledge> = {
  ecommerce: {
    name: 'ecommerce',
    description: '电子商务领域，包含商品、订单、用户、支付等核心概念',
    commonEntities: [
      'Product',
      'Order',
      'User',
      'Category',
      'Cart',
      'Payment',
      'Review',
      'Inventory',
    ],
    commonRelationships: [
      'User has-many Order',
      'Order contains-many Product',
      'Product belongs-to Category',
      'Product has-many Review',
      'User has-one Cart',
    ],
    keywords: [
      '商品',
      '订单',
      '用户',
      '购物车',
      '支付',
      '库存',
      '评价',
      '分类',
      '价格',
      '购买',
    ],
    patterns: [
      {
        name: 'product_management',
        description: '商品管理相关需求',
        entities: ['Product', 'Category', 'Inventory'],
        rules: ['商品必须有价格和库存', '分类可以嵌套'],
      },
      {
        name: 'order_flow',
        description: '订单流程相关需求',
        entities: ['Order', 'User', 'Payment'],
        rules: ['订单必须有状态管理', '支付失败订单需要特殊处理'],
      },
    ],
    businessRules: [
      '商品库存不能为负数',
      '订单金额必须大于零',
      '用户必须验证邮箱才能下单',
      '支付成功后才能减库存',
    ],
  },

  content_management: {
    name: 'content_management',
    description: '内容管理系统，包含文章、分类、标签、用户等概念',
    commonEntities: ['Article', 'Category', 'Tag', 'User', 'Comment', 'Media'],
    commonRelationships: [
      'Article belongs-to User',
      'Article belongs-to Category',
      'Article has-many Tag',
      'Article has-many Comment',
      'User has-many Article',
    ],
    keywords: [
      '文章',
      '内容',
      '分类',
      '标签',
      '评论',
      '发布',
      '编辑',
      '审核',
      '媒体',
      '作者',
    ],
    patterns: [
      {
        name: 'content_publishing',
        description: '内容发布流程',
        entities: ['Article', 'User'],
        rules: ['文章发布需要审核', '用户可以编辑自己的文章'],
      },
      {
        name: 'comment_system',
        description: '评论系统',
        entities: ['Comment', 'Article', 'User'],
        rules: ['评论需要审核', '用户只能删除自己的评论'],
      },
    ],
    businessRules: [
      '文章必须有标题和内容',
      '已发布文章不能被删除',
      '评论内容长度不能超过500字',
      '只有管理员可以审核文章',
    ],
  },

  user_management: {
    name: 'user_management',
    description: '用户管理系统，包含用户注册、登录、权限管理等',
    commonEntities: ['User', 'Role', 'Permission', 'Profile', 'Session'],
    commonRelationships: [
      'User has-one Profile',
      'User has-many Role',
      'Role has-many Permission',
      'User has-many Session',
    ],
    keywords: [
      '用户',
      '登录',
      '注册',
      '权限',
      '角色',
      '认证',
      '授权',
      '个人信息',
      '密码',
      '邮箱',
    ],
    patterns: [
      {
        name: 'authentication',
        description: '用户认证相关',
        entities: ['User', 'Session'],
        rules: ['密码需要加密存储', '登录需要验证码'],
      },
      {
        name: 'authorization',
        description: '权限管理相关',
        entities: ['User', 'Role', 'Permission'],
        rules: ['角色可以继承权限', '用户可以有多个角色'],
      },
    ],
    businessRules: [
      '用户邮箱必须唯一',
      '密码必须包含字母和数字',
      '用户登录失败超过5次需要锁定',
      '管理员权限不能被普通用户修改',
    ],
  },

  booking: {
    name: 'booking',
    description: '预订系统，包含预订、资源、时间槽等概念',
    commonEntities: [
      'Booking',
      'Resource',
      'TimeSlot',
      'User',
      'Payment',
      'Availability',
    ],
    commonRelationships: [
      'User makes-many Booking',
      'Booking uses Resource',
      'Booking has TimeSlot',
      'Resource has-many Availability',
    ],
    keywords: [
      '预订',
      '预约',
      '资源',
      '时间',
      '空闲',
      '占用',
      '支付',
      '取消',
      '可用性',
      '时间段',
    ],
    patterns: [
      {
        name: 'resource_booking',
        description: '资源预订',
        entities: ['Booking', 'Resource', 'TimeSlot'],
        rules: ['同一资源同一时间只能有一个预订', '预订需要支付定金'],
      },
      {
        name: 'availability_check',
        description: '可用性检查',
        entities: ['Resource', 'Availability', 'TimeSlot'],
        rules: ['需要检查资源可用性', '支持多时间段预订'],
      },
    ],
    businessRules: [
      '预订时间不能早于当前时间',
      '同一用户不能重复预订同一资源',
      '取消预订需要提前24小时',
      '预订超时未支付需要自动取消',
    ],
  },
};

// Helper function to match domain based on keywords
export const matchDomain = (text: string): string | null => {
  const textLower = text.toLowerCase();
  let bestMatch: string | null = null;
  let maxScore = 0;

  for (const [domainName, domain] of Object.entries(DOMAIN_KNOWLEDGE_BASE)) {
    let score = 0;

    // Check keyword matches
    for (const keyword of domain.keywords) {
      if (textLower.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }

    // Check entity mentions
    for (const entity of domain.commonEntities) {
      if (textLower.includes(entity.toLowerCase())) {
        score += 2;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = domainName;
    }
  }

  return bestMatch;
};

// Get domain-specific business rules
export const getDomainBusinessRules = (domain: string): string[] => {
  return DOMAIN_KNOWLEDGE_BASE[domain]?.businessRules || [];
};

// Get common entities for a domain
export const getDomainEntities = (domain: string): string[] => {
  return DOMAIN_KNOWLEDGE_BASE[domain]?.commonEntities || [];
};

// Get patterns for a domain
export const getDomainPatterns = (domain: string) => {
  return DOMAIN_KNOWLEDGE_BASE[domain]?.patterns || [];
};
