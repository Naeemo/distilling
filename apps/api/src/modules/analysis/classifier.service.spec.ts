import { ClassifierService } from './classifier.service';
import { ClassificationInput, InfoType, ClassifierConfig } from './classifier.types';

describe('ClassifierService', () => {
  let service: ClassifierService;

  beforeEach(() => {
    service = new ClassifierService();
  });

  describe('basic classification', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should classify breaking news correctly', () => {
      const input: ClassificationInput = {
        title: '【突发】日本本州东海岸发生7.2级地震 引发海啸预警',
        firstParagraph: '据日本气象厅消息，当地时间今日下午2时许，日本本州东海岸附近海域发生强烈地震，震级初步测定为7.2级，震源深度约30公里。地震已引发海啸预警，相关部门正在评估灾情。',
        url: 'https://example.com/news/12345',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('breaking');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.matchedRules.length).toBeGreaterThan(0);
    });

    it('should classify analysis article correctly', () => {
      const input: ClassificationInput = {
        title: '深度解读：美联储降息背后的逻辑与全球影响',
        firstParagraph: '美联储于本周宣布降息25个基点，这一决定看似例行公事，实则蕴含深意。从通胀数据、就业市场到全球经济形势，我们需要从多个维度来理解这一政策转向。首先，核心通胀已连续三个月回落...',
        url: 'https://example.com/analysis/fed-rate-cut',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('analysis');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should classify research paper correctly', () => {
      const input: ClassificationInput = {
        title: '最新研究：深度学习在蛋白质结构预测中的应用',
        firstParagraph: '本研究提出了一种基于Transformer架构的新型蛋白质结构预测方法。我们在CASP14数据集上进行了验证，结果表明该方法在TM-score指标上达到了0.92，显著优于现有方法。实验样本包括2000种已知蛋白质结构。',
        url: 'https://arxiv.org/abs/2403.12345',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('research');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should classify opinion piece correctly', () => {
      const input: ClassificationInput = {
        title: '观点：我认为人工智能不会取代程序员',
        firstParagraph: '最近关于AI编程工具的讨论很多，很多人觉得程序员这个职业即将消失。但在我看来，这种担忧是被夸大了。编程不仅仅是写代码，更重要的是理解需求、设计架构、解决复杂问题。',
        url: 'https://example.com/opinion/ai-programmers',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('opinion');
    });

    it('should classify data report correctly', () => {
      const input: ClassificationInput = {
        title: '2024年Q1全球智能手机市场报告：出货量同比下降8%',
        firstParagraph: '根据最新统计数据显示，2024年第一季度全球智能手机出货量达到2.89亿部，同比下降8.3%，环比下降12.1%。其中，苹果以23%的市场份额位居第一，三星以19%紧随其后。图表1展示了各品牌市场份额变化趋势。本报告基于对全球主要市场的数据分析，包括中国、美国、欧洲和印度等地区。',
        url: 'https://example.com/report/smartphone-q1-2024',
      };

      const result = service.classify(input);

      expect(['data', 'research']).toContain(result.infoType);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should classify tutorial correctly', () => {
      const input: ClassificationInput = {
        title: '手把手教你使用Docker部署Node.js应用',
        firstParagraph: '本教程将带你从零开始学习如何使用Docker容器化Node.js应用。第一步，确保你的系统已安装Docker。然后创建一个项目目录，并初始化npm项目。接着编写Dockerfile配置文件，定义基础镜像和依赖安装步骤。',
        url: 'https://example.com/tutorial/docker-nodejs',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('tutorial');
    });

    it('should classify noise content correctly', () => {
      const input: ClassificationInput = {
        title: '震惊！！！99%的人都不知道的赚钱秘诀！！！',
        firstParagraph: '限时优惠！点击领取！免费赠送！马上行动！',
        url: 'https://example.com/promo/clickbait',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('noise');
    });
  });

  describe('domain mapping', () => {
    it('should classify by domain - arxiv', () => {
      const input: ClassificationInput = {
        title: 'Some random title',
        firstParagraph: 'Some random content without clear markers.',
        url: 'https://arxiv.org/abs/2401.12345',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('research');
      expect(result.confidence).toBe(0.85);
      expect(result.matchedRules).toContain('domain_mapping');
    });

    it('should classify by domain - bloomberg', () => {
      const input: ClassificationInput = {
        title: 'Market Update',
        firstParagraph: 'Markets moved today.',
        url: 'https://www.bloomberg.com/news/articles/2024-01-01/markets',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('breaking');
    });

    it('should classify by domain - stats.gov.cn', () => {
      const input: ClassificationInput = {
        title: '统计数据',
        firstParagraph: '统计数据发布。',
        url: 'https://stats.gov.cn/data/2024',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('data');
    });
  });

  describe('confidence calculation', () => {
    it('should return high confidence for clear matches', () => {
      const input: ClassificationInput = {
        title: '【突发】重大突破！科学家发现新型治疗方法',
        firstParagraph: '这项发表在Nature杂志上的研究震惊了学术界。',
        url: 'https://example.com/news/breakthrough',
      };

      const result = service.classify(input);

      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include scores for all types', () => {
      const input: ClassificationInput = {
        title: 'Test Article',
        firstParagraph: 'This is a test paragraph.',
        url: 'https://example.com/test',
      };

      const result = service.classify(input);

      const expectedTypes: InfoType[] = ['breaking', 'analysis', 'research', 'opinion', 'data', 'tutorial', 'noise'];
      expectedTypes.forEach(type => {
        expect(result.scores[type]).toBeDefined();
        expect(typeof result.scores[type]).toBe('number');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty content gracefully', () => {
      const input: ClassificationInput = {
        title: 'Test',
        firstParagraph: '',
        url: 'https://example.com',
      };

      const result = service.classify(input);

      expect(result.infoType).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid URL gracefully', () => {
      const input: ClassificationInput = {
        title: 'Test',
        firstParagraph: 'Test content',
        url: 'not-a-valid-url',
      };

      const result = service.classify(input);

      expect(result.infoType).toBeDefined();
    });

    it('should handle very long title', () => {
      const input: ClassificationInput = {
        title: '分析'.repeat(100),
        firstParagraph: 'Test content',
        url: 'https://example.com',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('analysis');
    });
  });

  describe('batch classification', () => {
    it('should classify multiple inputs', () => {
      const inputs: ClassificationInput[] = [
        {
          title: '突发新闻标题',
          firstParagraph: '突发新闻内容',
          url: 'https://example.com/breaking',
        },
        {
          title: '深度分析标题',
          firstParagraph: '深度分析内容，原因在于...',
          url: 'https://example.com/analysis',
        },
        {
          title: '研究报告标题',
          firstParagraph: '研究表明...',
          url: 'https://example.com/research',
        },
      ];

      const results = service.classifyBatch(inputs);

      expect(results).toHaveLength(3);
      expect(results[0].infoType).toBe('breaking');
      expect(results[1].infoType).toBe('analysis');
      expect(results[2].infoType).toBe('research');
    });
  });

  describe('entropy calculation', () => {
    it('should calculate entropy correctly', () => {
      const lowEntropy = 'aaaaaaaaaa';
      const highEntropy = 'The quick brown fox jumps over the lazy dog.';

      const lowResult = service.calculateEntropy(lowEntropy);
      const highResult = service.calculateEntropy(highEntropy);

      expect(lowResult).toBeLessThan(highResult);
      expect(lowResult).toBeLessThan(2);
      expect(highResult).toBeGreaterThan(3);
    });

    it('should detect low entropy content', () => {
      const lowEntropyText = '哈哈哈哈哈哈哈哈';
      
      expect(service.isLowEntropy(lowEntropyText)).toBe(true);
    });

    it('should detect normal entropy content', () => {
      const normalText = '这是一段正常的中文文本，包含多种不同的字符和词汇。';
      
      expect(service.isLowEntropy(normalText)).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should allow custom configuration', () => {
      const customConfig: Partial<ClassifierConfig> = {
        defaultType: 'tutorial',
        minConfidence: 0.5,
      };

      const customService = new ClassifierService(customConfig);
      const config = customService.getConfig();

      expect(config.defaultType).toBe('tutorial');
      expect(config.minConfidence).toBe(0.5);
    });

    it('should update configuration', () => {
      service.updateConfig({ defaultType: 'data' });
      const config = service.getConfig();

      expect(config.defaultType).toBe('data');
    });

    it('should add and remove domain mappings', () => {
      service.addDomainMapping('my-custom-domain.com', 'tutorial');
      
      const input: ClassificationInput = {
        title: 'Test',
        firstParagraph: 'Test',
        url: 'https://my-custom-domain.com/article',
      };

      const result = service.classify(input);
      expect(result.infoType).toBe('tutorial');

      service.removeDomainMapping('my-custom-domain.com');
      const result2 = service.classify(input);
      expect(result2.infoType).not.toBe('tutorial');
    });

    it('should return supported types', () => {
      const types = service.getSupportedTypes();

      expect(types).toContain('breaking');
      expect(types).toContain('analysis');
      expect(types).toContain('research');
      expect(types).toContain('opinion');
      expect(types).toContain('data');
      expect(types).toContain('tutorial');
      expect(types).toContain('noise');
    });
  });

  describe('mixed language content', () => {
    it('should classify English breaking news', () => {
      const input: ClassificationInput = {
        title: 'BREAKING: Major earthquake hits California, magnitude 7.0',
        firstParagraph: 'A powerful earthquake struck Northern California today, causing widespread damage and prompting emergency evacuations. Officials are assessing the situation.',
        url: 'https://example.com/news/earthquake',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('breaking');
    });

    it('should classify English tutorial', () => {
      const input: ClassificationInput = {
        title: 'How to Build a REST API with Node.js - Complete Guide',
        firstParagraph: 'In this tutorial, we will learn how to build a REST API step by step. First, initialize your project with npm init. Then install Express. Next, create your server file.',
        url: 'https://example.com/guide/nodejs-api',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('tutorial');
    });

    it('should classify English research', () => {
      const input: ClassificationInput = {
        title: 'New Study Reveals Impact of Climate Change on Coral Reefs',
        firstParagraph: 'Our research examined 500 coral reef sites across the Pacific. Using satellite imagery and field surveys, we found that 70% of reefs showed signs of bleaching (p < 0.001). The findings suggest urgent action is needed.',
        url: 'https://example.com/study/coral-reefs',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('research');
    });
  });

  describe('URL pattern matching', () => {
    it('should detect tutorial from URL path', () => {
      const input: ClassificationInput = {
        title: 'Building Apps',
        firstParagraph: 'Let us start by creating a new project. First, make sure you have Node.js installed. Then run npm init to initialize the project. Next, install the required dependencies. Finally, create the main entry file.',
        url: 'https://example.com/tutorial/react-native-basics',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('tutorial');
    });

    it('should detect analysis from URL path', () => {
      const input: ClassificationInput = {
        title: 'Market Trends',
        firstParagraph: 'Understanding the current situation requires careful examination.',
        url: 'https://example.com/analysis/2024-trends',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('analysis');
    });

    it('should detect research from URL path', () => {
      const input: ClassificationInput = {
        title: 'Scientific Findings',
        firstParagraph: 'The experiment was conducted with proper methodology.',
        url: 'https://example.com/research/paper-123',
      };

      const result = service.classify(input);

      expect(result.infoType).toBe('research');
    });
  });
});
