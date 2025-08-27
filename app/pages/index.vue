<template>
  <div class="home-container">
    <div class="hero-section">
      <h1 class="hero-title">AI代码生成助手</h1>
      <p class="hero-description">基于人工智能的智能代码生成工具，帮助您快速生成高质量代码</p>
      <div class="hero-actions">
        <el-button type="primary" size="large" @click="goToChat">
          <el-icon><ChatDotRound /></el-icon>
          开始对话
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChatDotRound } from '@element-plus/icons-vue';

/**
 * 跳转到聊天页面
 */
const goToChat = () => {
  navigateTo('/chat');
};
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.hero-section {
  text-align: center;
  color: white;
  max-width: 600px;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.hero-description {
  font-size: 1.2rem;
  margin-bottom: 2rem;
  opacity: 0.9;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-description {
    font-size: 1rem;
  }
}
</style>
