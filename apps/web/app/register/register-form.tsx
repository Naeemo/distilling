import { PasswordlessAuthCard } from '@/components/passwordless-auth-card';

export function RegisterForm({
  availability,
}: {
  availability: {
    google: boolean;
    github: boolean;
    magicLink: boolean;
  };
}) {
  return <PasswordlessAuthCard mode="register" availability={availability} />;
}
