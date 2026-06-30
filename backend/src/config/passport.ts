import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcryptjs';
import { UserProfile } from '../models';
import { ensureSuperadminRole } from '../utils/superadmin';
import { isServerDeployment } from '../utils/deployment';
import { createFreeLicenseForUser } from '../services/license-key.service';
import { seedDefaultExchangeRates } from '../utils/seed';

// Local Strategy (Username/Password)
passport.use(
    new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'password'
        },
        async (email, password, done) => {
            try {
                const user = await UserProfile.findOne({ where: { email } });

                if (!user) {
                    return done(null, false, { message: 'Invalid email or password' });
                }

                if (!user.password) {
                    return done(null, false, { message: 'Please use social login' });
                }

                const isMatch = await bcrypt.compare(password, user.password);

                if (!isMatch) {
                    return done(null, false, { message: 'Invalid email or password' });
                }

                const promoted = await ensureSuperadminRole(user);
                return done(null, promoted);
            } catch (error) {
                return done(error);
            }
        }
    )
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/auth/google/callback'
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    // Check if user exists
                    let user = await UserProfile.findOne({
                        where: {
                            authProvider: 'google',
                            providerId: profile.id
                        }
                    });

                    if (!user) {
                        user = await UserProfile.create({
                            id: `google_${profile.id}_${Date.now()}`,
                            email: profile.emails?.[0]?.value,
                            displayName: profile.displayName,
                            photoURL: profile.photos?.[0]?.value,
                            role: 'user',
                            authProvider: 'google',
                            providerId: profile.id
                        });

                        await seedDefaultExchangeRates(user.id);

                        if (isServerDeployment()) {
                            try {
                                await createFreeLicenseForUser(user.id);
                            } catch (licenseError) {
                                console.error('Free license creation failed:', licenseError);
                            }
                        }
                    }

                    const promoted = await ensureSuperadminRole(user);
                    return done(null, promoted);
                } catch (error) {
                    return done(error as Error);
                }
            }
        )
    );
}

// Telegram Strategy (placeholder - requires telegram-passport library configuration)
// Note: passport-telegram-official might need additional setup
// This is a simplified version
/* 
if (process.env.TELEGRAM_BOT_TOKEN) {
  const TelegramStrategy = require('passport-telegram-official').TelegramStrategy;
  
  passport.use(
    new TelegramStrategy(
      {
        botToken: process.env.TELEGRAM_BOT_TOKEN
      },
      async (profile: any, done: any) => {
        try {
          let user = await UserProfile.findOne({
            where: {
              authProvider: 'telegram',
              providerId: profile.id.toString()
            }
          });

          if (!user) {
            user = await UserProfile.create({
              id: `telegram_${profile.id}_${Date.now()}`,
              displayName: profile.first_name + (profile.last_name ? ` ${profile.last_name}` : ''),
              photoURL: profile.photo_url,
              role: 'user',
              authProvider: 'telegram',
              providerId: profile.id.toString()
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );
}
*/

passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await UserProfile.findByPk(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

export default passport;
