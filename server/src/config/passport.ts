import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { PrismaClient, Role } from '@prisma/client';
import { generateToken } from '../middleware/auth';
import crypto from 'crypto';

const prisma = new PrismaClient();

// 生成随机密码的辅助函数
function generateRandomPassword(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Google OAuth 2.0 策略
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_REDIRECT_URI || '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 检查用户是否已存在
          let user = await prisma.user.findUnique({
            where: { email: profile.emails?.[0]?.value },
          });

          if (!user) {
            // 创建新用户
            user = await prisma.user.create({
              data: {
                email: profile.emails?.[0]?.value || '',
                name: profile.displayName || profile.username || 'Google用户',
                avatar: profile.photos?.[0]?.value,
                role: Role.USER,
                password: generateRandomPassword(), // 为Google用户设置一个随机密码
              },
            });
          } else {
            // 更新用户信息（如头像）
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                name: profile.displayName || user.name,
                avatar: profile.photos?.[0]?.value || user.avatar,
              },
            });
          }

          return done(null, user);
        } catch (error) {
          console.error('Google OAuth 错误:', error);
          return done(error, undefined);
        }
      }
    )
  );
}

// GitHub OAuth 2.0 策略
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_REDIRECT_URI || '/api/auth/github/callback',
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          // 添加调试日志
          console.log('=== GitHub OAuth 开始 ===');
          console.log('GitHub OAuth Profile:', {
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            emails: profile.emails,
            photos: profile.photos
          });

          // 获取邮箱地址，如果为空则使用username生成
          const email = profile.emails?.[0]?.value;
          const fallbackEmail = `${profile.username}@github.local`;
          const userEmail = email || fallbackEmail;

          console.log('邮箱处理:', {
            originalEmail: email,
            fallbackEmail,
            finalEmail: userEmail
          });

          // 检查用户是否已存在
          let user = await prisma.user.findUnique({
            where: { email: userEmail },
          });

          if (!user) {
            // 创建新用户
            console.log('创建新GitHub用户...');
            user = await prisma.user.create({
              data: {
                email: userEmail,
                name: profile.displayName || profile.username || 'GitHub用户',
                avatar: profile.photos?.[0]?.value,
                role: Role.USER,
                password: generateRandomPassword(), // 为GitHub用户设置一个随机密码
              },
            });
            console.log('✅ 新GitHub用户创建成功:', user.id);
          } else {
            // 更新用户信息
            console.log('更新现有GitHub用户...');
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                name: profile.displayName || user.name,
                avatar: profile.photos?.[0]?.value || user.avatar,
              },
            });
            console.log('✅ 现有GitHub用户更新成功:', user.id);
          }

          console.log('=== GitHub OAuth 完成 ===');
          return done(null, user);
        } catch (error) {
          console.error('❌ GitHub OAuth 错误:', error);
          return done(error, undefined);
        }
      }
    )
  );
}

// JWT 策略（用于 API 认证）
if (process.env.JWT_SECRET) {
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
        issuer: 'learnflow',
        audience: 'learnflow-users',
      },
      async (payload, done) => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              avatar: true,
            },
          });

          if (user) {
            return done(null, user);
          } else {
            return done(null, false);
          }
        } catch (error) {
          console.error('JWT 策略错误:', error);
          return done(error, false);
        }
      }
    )
  );
}

// Passport 序列化配置（用于 session）
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
      },
    });
    done(null, user);
  } catch (error) {
    console.error('反序列化用户错误:', error);
    done(error, null);
  }
});

export default passport;
