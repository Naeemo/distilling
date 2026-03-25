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
exports.HighlightService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let HighlightService = class HighlightService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, data) {
        return this.prisma.highlight.create({
            data: {
                userId,
                contentId: data.contentId,
                highlightText: data.highlightText,
                position: data.position,
                color: data.color || 'yellow',
                note: data.note,
            },
        });
    }
    async update(userId, id, data) {
        const highlight = await this.prisma.highlight.findFirst({
            where: { id, userId },
        });
        if (!highlight) {
            throw new common_1.NotFoundException('Highlight not found');
        }
        return this.prisma.highlight.update({
            where: { id },
            data,
        });
    }
    async delete(userId, id) {
        const highlight = await this.prisma.highlight.findFirst({
            where: { id, userId },
        });
        if (!highlight) {
            throw new common_1.NotFoundException('Highlight not found');
        }
        await this.prisma.highlight.delete({
            where: { id },
        });
        return { success: true };
    }
};
exports.HighlightService = HighlightService;
exports.HighlightService = HighlightService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HighlightService);
//# sourceMappingURL=highlight.service.js.map