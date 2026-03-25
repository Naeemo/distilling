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
exports.ContentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const content_service_1 = require("./content.service");
const dto_1 = require("./dto");
let ContentController = class ContentController {
    constructor(contentService) {
        this.contentService = contentService;
    }
    async createFromUrl(req, dto) {
        return this.contentService.createFromUrl(req.user.userId, dto.url, dto.tags);
    }
    async createFromText(req, dto) {
        return this.contentService.createFromText(req.user.userId, dto.title, dto.contentText, dto.tags);
    }
    async findAll(req, status, tagId, search, page, limit) {
        return this.contentService.findAll(req.user.userId, {
            status,
            tagId,
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }
    async findOne(req, id) {
        return this.contentService.findOne(req.user.userId, id);
    }
    async updateStatus(req, id, dto) {
        return this.contentService.updateStatus(req.user.userId, id, dto.status);
    }
    async updateReadingProgress(req, id, dto) {
        return this.contentService.updateReadingProgress(req.user.userId, id, {
            progress: dto.progress,
            position: dto.position,
            readingTime: dto.readingTime,
        });
    }
    async archive(req, id) {
        return this.contentService.archive(req.user.userId, id);
    }
};
exports.ContentController = ContentController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: '添加内容（URL）' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateContentDto]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "createFromUrl", null);
__decorate([
    (0, common_1.Post)('text'),
    (0, swagger_1.ApiOperation)({ summary: '添加内容（纯文本）' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateTextContentDto]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "createFromText", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: '获取内容列表' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('tagId')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: '获取内容详情' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, swagger_1.ApiOperation)({ summary: '更新阅读状态' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateStatusDto]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/progress'),
    (0, swagger_1.ApiOperation)({ summary: '更新阅读进度' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateReadingProgressDto]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "updateReadingProgress", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: '归档内容' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ContentController.prototype, "archive", null);
exports.ContentController = ContentController = __decorate([
    (0, swagger_1.ApiTags)('内容'),
    (0, common_1.Controller)('contents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [content_service_1.ContentService])
], ContentController);
//# sourceMappingURL=content.controller.js.map