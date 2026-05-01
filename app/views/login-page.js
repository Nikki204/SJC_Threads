import { authService } from '../utils/auth';
import { Frame } from '@nativescript/core';

export function onNavigatingTo(args) {
  const page = args.object;
  page.bindingContext = createViewModel(page);
}

function createViewModel(page) {
  const vm = {};

  vm.onSignIn = async () => {
    const email = page.getViewById('email').text;
    const password = page.getViewById('password').text;
    const errorLabel = page.getViewById('error');
    const loading = page.getViewById('loading');

    errorLabel.text = '';
    loading.busy = true;

    try {
      await authService.signIn(email, password);
      Frame.topmost().navigate({
        moduleName: 'views/home-page',
        clearHistory: true
      });
    } catch (err) {
      errorLabel.text = err.message || 'Sign in failed';
    } finally {
      loading.busy = false;
    }
  };

  vm.onGoToRegister = () => {
    Frame.topmost().navigate('views/register-page');
  };

  vm.onForgotPassword = async () => {
    const email = page.getViewById('email').text;
    if (!email) {
      const errorLabel = page.getViewById('error');
      errorLabel.text = 'Enter your email to reset password';
      return;
    }
    try {
      const { error } = await authService.supabase?.auth?.resetPasswordForEmail?.(email);
    } catch (e) {
      // silently handle
    }
  };

  return vm;
}
