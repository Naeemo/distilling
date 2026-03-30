import { redirectIfAuthenticated } from '@/lib/session';
import { RegisterForm } from './register-form';

export default async function RegisterPage() {
  await redirectIfAuthenticated();
  return <RegisterForm />;
}
