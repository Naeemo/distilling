import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class AuthService {
    private readonly userService;
    private readonly jwtService;
    private readonly prisma;
    constructor(userService: UserService, jwtService: JwtService, prisma: PrismaService);
    validateUser(email: string, password: string): Promise<any>;
    login(email: string, password: string): Promise<{
        user: any;
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    register(email: string, password: string, name?: string): Promise<{
        user: {
            id: string;
            email: string;
            name: string;
            avatar: string;
            subscription: import("@prisma/client").$Enums.SubscriptionTier;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    private generateTokens;
    getProfile(userId: string): Promise<{
        id: string;
        email: string;
        name: string;
        avatar: string;
        subscription: import("@prisma/client").$Enums.SubscriptionTier;
        createdAt: Date;
    }>;
}
