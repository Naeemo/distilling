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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let TagService = class TagService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId) {
        const tags = await this.prisma.tag.findMany({
            where: { userId },
            include: {
                _count: {
                    select: { contents: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            contentCount: tag._count.contents,
        }));
    }
    async create(userId, name, color) {
        return this.prisma.tag.create({
            data: {
                userId,
                name,
                color: color || '#3b82f6',
            },
        });
    }
    async addTagToContent(contentId, tagId) {
        await this.prisma.contentTag.create({
            data: {
                contentId,
                tagId,
            },
        });
        return { success: true };
    }
    async removeTagFromContent(contentId, tagId) {
        await this.prisma.contentTag.delete({
            where: {
                contentId_tagId: {
                    contentId,
                    tagId,
                },
            },
        });
        return { success: true };
    }
};
exports.TagService = TagService;
exports.TagService = TagService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TagService);
//# sourceMappingURL=tag.service.js.map