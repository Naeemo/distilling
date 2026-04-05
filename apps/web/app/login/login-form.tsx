import { PasswordlessAuthCard } from '@/components/passwordless-auth-card';

export function LoginForm({
  availability,
}: {
  availability: {
    google: boolean;
    github: boolean;
    magicLink: boolean;
  };
}) {
  return <PasswordlessAuthCard mode="login" availability={availability} />;
}
