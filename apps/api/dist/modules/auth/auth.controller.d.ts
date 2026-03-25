import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
        user: any;
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    register(registerDto: RegisterDto): Promise<{
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
    refresh(refreshTokenDto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getProfile(req: any): Promise<{
        id: string;
        email: string;
        name: string;
        avatar: string;
        subscription: import("@prisma/client").$Enums.SubscriptionTier;
        createdAt: Date;
    }>;
}
