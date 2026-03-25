"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const ai_service_1 = require("./ai.service");
const dto_1 = require("./dto");
let AiController = class AiController {
    constructor(aiService) {
        this.aiService = aiService;
    }
    async summarize(req, dto, res) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const chunks = [];
        try {
            const result = await this.aiService.generateSummary(dto.contentId, dto.type, (chunk) => {
                chunks.push(chunk);
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            });
            res.write(`data: ${JSON.stringify({
                summaryId: result.summaryId,
                summaryText: result.summaryText,
                tokensUsed: result.tokensUsed,
            })}\n\n`);
            res.end();
        }
        catch (error) {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
    async getSummaries(req, id) {
        return this.aiService.getSummaries(id);
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('summarize'),
    (0, swagger_1.ApiOperation)({ summary: '生成摘要（流式）' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.SummarizeDto, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "summarize", null);
__decorate([
    (0, common_1.Get)('contents/:id/summaries'),
    (0, swagger_1.ApiOperation)({ summary: '获取摘要历史' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getSummaries", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('AI'),
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map