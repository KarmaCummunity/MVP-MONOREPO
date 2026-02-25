/**
 * @file LandingSiteScreen
 * @description Wrapper that delegates to the legacy landing page.
 * Use this file to switch between legacy and new modular landing.
 */

import React from 'react';
import LandingSiteScreenLegacy from '../LandingSiteScreen.legacy';

/**
 * LandingSiteScreen – currently showing legacy site.
 * To use the new modular landing, replace the return with the new component.
 */
const LandingSiteScreen: React.FC = () => {
  return <LandingSiteScreenLegacy />;
};

export default LandingSiteScreen;
