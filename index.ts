import './src/app/bootstrap'; // must run first: a background relaunch by iOS has no UI
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
