<template>
  <div class="home-container">
    <div class="welcome">
      <h1>欢迎使用 Web Tools</h1>
      <p>一个简洁高效的在线工具集合</p>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :lg="8" v-for="tool in tools" :key="tool.path">
        <router-link :to="tool.path" class="tool-link">
          <el-card class="tool-card" shadow="hover">
            <el-icon class="tool-icon" :size="56">
              <component :is="tool.icon" />
            </el-icon>
            <h3>{{ tool.title }}</h3>
            <p>{{ tool.description }}</p>
          </el-card>
        </router-link>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
const tools = [
  {
    path: '/diff',
    title: 'Diff 工具',
    description: '在线对比文本差异，生成 patch 文件',
    icon: 'Files'
  },
  {
    path: '/formatter',
    title: '代码格式化',
    description: '支持 JSON、XML、YAML 等格式的代码格式化',
    icon: 'Document'
  },
  {
    path: '/json-compare',
    title: 'JSON/XML 对比',
    description: '对比 JSON/XML 对象，高亮显示差异，支持数组匹配',
    icon: 'DataAnalysis'
  },
  {
    path: '/base64',
    title: 'Base64 查看',
    description: '智能解析 Base64 数据，支持图片、PDF 等格式预览',
    icon: 'DataAnalysis'
  },
  {
    path: '/hash',
    title: 'Hash 计算',
    description: '计算文件 MD5、SHA256 等哈希值',
    icon: 'Key'
  },
  {
    path: '/totp',
    title: 'TOTP 验证码',
    description: '生成和管理 TOTP 两步验证码',
    icon: 'Key'
  },
  {
    path: '/gobang',
    title: '五子棋',
    description: '简单有趣的五子棋小游戏',
    icon: 'Grid'
  },
  {
    path: '/game24',
    title: '24 点',
    description: '经典扑克牌数学益智游戏',
    icon: 'Odometer'
  },
  {
    path: '/showhand',
    title: '梭哈',
    description: '经典扑克游戏，与 AI 对战比拼牌力',
    icon: 'Van'
  },
  {
    path: '/mahjong',
    title: '广东麻将',
    description: '经典广东麻将，1 人对战 3 个 AI',
    icon: 'Grid'
  },
  {
    path: '/math-ten',
    title: '凑十破十',
    description: '小学数学练习游戏，学习凑十法和破十法',
    icon: 'Odometer'
  },
  {
    path: '/multiplication',
    title: '小小乘法表',
    description: '乘法口诀练习，挑战 35 分通关',
    icon: 'Coin'
  },
  {
    path: '/stream-merge',
    title: 'LLM 流式整理',
    description: '将 LLM API 流式输出合并为单个数据',
    icon: 'Document'
  }
]
</script>

<style scoped>
.home-container {
  padding: 30px;
  max-width: 1200px;
  margin: 0 auto;
  overflow-y: auto;
}

.welcome {
  text-align: center;
  margin-bottom: 40px;
}

.welcome h1 {
  font-size: 32px;
  color: #303133;
  margin-bottom: 10px;
}

.welcome p {
  font-size: 16px;
  color: #909399;
}

.tool-link {
  text-decoration: none;
  display: block;
  margin-bottom: 20px;
}

.tool-card {
  text-align: center;
  padding: 30px 20px;
  transition: all 0.3s;
  cursor: pointer;
}

.tool-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.3);
}

.tool-icon {
  color: #409eff;
  margin-bottom: 15px;
}

.tool-card h3 {
  font-size: 18px;
  color: #303133;
  margin-bottom: 10px;
}

.tool-card p {
  font-size: 14px;
  color: #909399;
  line-height: 1.6;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .home-container {
    padding: 15px;
  }

  .welcome {
    margin-bottom: 25px;
  }

  .welcome h1 {
    font-size: 24px;
  }

  .welcome p {
    font-size: 14px;
  }

  .tool-card {
    padding: 20px 15px;
  }

  .tool-icon {
    --el-icon-size: 40px;
  }

  .tool-card h3 {
    font-size: 16px;
  }

  .tool-card p {
    font-size: 13px;
  }
}
</style>
