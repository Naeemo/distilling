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
exports.ContentTagController = exports.TagController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const tag_service_1 = require("./tag.service");
const dto_1 = require("./dto");
let TagController = class TagController {
    constructor(tagService) {
        this.tagService = tagService;
    }
    async findAll(req) {
        const tags = await this.tagService.findAll(req.user.userId);
        return { tags };
    }
    async create(req, dto) {
        return this.tagService.create(req.user.userId, dto.name, dto.color);
    }
};
exports.TagController = TagController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: '获取标签列表' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TagController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: '创建标签' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateTagDto]),
    __metadata("design:returntype", Promise)
], TagController.prototype, "create", null);
exports.TagController = TagController = __decorate([
    (0, swagger_1.ApiTags)('标签'),
    (0, common_1.Controller)('tags'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [tag_service_1.TagService])
], TagController);
let ContentTagController = class ContentTagController {
    constructor(tagService) {
        this.tagService = tagService;
    }
    async addTag(req, contentId, dto) {
        return this.tagService.addTagToContent(contentId, dto.tagId);
    }
    async removeTag(req, contentId, tagId) {
        return this.tagService.removeTagFromContent(contentId, tagId);
    }
};
exports.ContentTagController = ContentTagController;
__decorate([
    (0, common_1.Post)(':id/tags'),
    (0, swagger_1.ApiOperation)({ summary: '为内容添加标签' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], ContentTagController.prototype, "addTag", null);
__decorate([
    (0, common_1.Delete)(':id/tags/:tagId'),
    (0, swagger_1.ApiOperation)({ summary: '移除内容标签' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Param)('tagId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ContentTagController.prototype, "removeTag", null);
exports.ContentTagController = ContentTagController = __decorate([
    (0, swagger_1.ApiTags)('内容标签'),
    (0, common_1.Controller)('contents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [tag_service_1.TagService])
], ContentTagController);
//# sourceMappingURL=tag.controller.js.map