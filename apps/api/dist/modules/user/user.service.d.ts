import { PrismaService } from '../../prisma/prisma.service';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    findByEmail(email: string): Promise<{
        id: string;
        email: string;
        name: string | null;
        avatar: string | null;
        password: string;
        role: import("@prisma/client").$Enums.UserRole;
        subscription: import("@prisma/client").$Enums.SubscriptionTier;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    findById(id: string): Promise<{
        id: string;
        email: string;
        name: string | null;
        avatar: string | null;
        password: string;
        role: import("@prisma/client").$Enums.UserRole;
        subscription: import("@prisma/client").$Enums.SubscriptionTier;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    create(data: {
        email: string;
        password: string;
        name: string;
    }): Promise<{
        id: string;
        email: string;
        name: string | null;
        avatar: string | null;
        password: string;
        role: import("@prisma/client").$Enums.UserRole;
        subscription: import("@prisma/client").$Enums.SubscriptionTier;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
