import { redirectIfAuthenticated } from '@/lib/session';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  await redirectIfAuthenticated();
  return <LoginForm />;
}
