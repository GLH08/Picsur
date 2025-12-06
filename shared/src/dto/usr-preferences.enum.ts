import { z } from 'zod';
import { PrefValueTypeStrings } from './preferences.dto.js';

// This enum is only here to make accessing the values easier, and type checking in the backend
// Currently empty - no user preferences defined
export enum UsrPreference {
  // 已删除 KeepOriginal 选项
}

export type UsrPreferences = UsrPreference[];
export const UsrPreferenceList: string[] = Object.values(UsrPreference);

// Usrpref Value types
export const UsrPreferenceValueTypes: {
  [key in UsrPreference]: PrefValueTypeStrings;
} = {};

export const UsrPreferenceValidators: {
  [key in UsrPreference]: z.ZodTypeAny;
} = {};
