import { authService } from '../utils/auth';
import { Frame } from '@nativescript/core';

export function onNavigatingTo(args) {
  const page = args.object;
  page.bindingContext = createViewModel(page);
}

function createViewModel(page) {
  const vm = {};

  vm.onRegister = async () => {
    const displayName = page.getViewById('displayName').text;
    const username = page.getViewById('username').text;
    const email = page.getViewById('email').text;
    const password = page.getViewById('password').text;
    const confirmPassword = page.getViewById('confirmPassword').text;
    const errorLabel = page.getViewById('error');
    const loading = page.getViewById('loading');

    errorLabel.text = '';

    if (!displayName || !username || !email || !password) {
      errorLabel.text = 'All fields are required';
      return;
    }
    if (password !== confirmPassword) {
      errorLabel.text = 'Passwords do not match';
      return;
    }
    if (password.length < 6) {
      errorLabel.text = 'Password must be at least 6 characters';
      return;
    }

    loading.busy = true;

    try {
      await authService.signUp(email, password, username, displayName);
      Frame.topmost().navigate({
        moduleName: 'views/home-page',
        clearHistory: true,
      });
    } catch (err) {
      errorLabel.text = err.message || 'Registration failed';
    } finally {
      loading.busy = false;
    }
  };

  vm.onGoToLogin = () => {
    Frame.topmost().goBack();
  };

  return vm;
}
