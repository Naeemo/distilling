import { redirectIfAuthenticated } from '@/lib/session';
import { getAuthMethodAvailability } from '@/lib/auth-provider-config';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  await redirectIfAuthenticated();
  return <LoginForm availability={getAuthMethodAvailability()} />;
}
