// Force light appearance (ns-light + Android night mode off) so white/navy CSS wins over system dark mode.
import Theme from '@nativescript/theme';
Theme.setMode(Theme.Light);

import { Application } from '@nativescript/core';
import './app.css';

Application.run({ moduleName: 'app-root' });
