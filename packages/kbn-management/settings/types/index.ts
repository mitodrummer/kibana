/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SettingType } from './setting_type';
import { UnsavedFieldChange } from './unsaved_change';

export type {
  ArrayFieldDefinition,
  BooleanFieldDefinition,
  ColorFieldDefinition,
  ImageFieldDefinition,
  JsonFieldDefinition,
  FieldDefinition,
  MarkdownFieldDefinition,
  NumberFieldDefinition,
  SelectFieldDefinition,
  StringFieldDefinition,
  UndefinedFieldDefinition,
} from './field_definition';

export type {
  ArrayUiSettingMetadata,
  BooleanUiSettingMetadata,
  ColorUiSettingMetadata,
  ImageUiSettingMetadata,
  JsonUiSettingMetadata,
  MarkdownUiSettingMetadata,
  NumberUiSettingMetadata,
  SelectUiSettingMetadata,
  StringUiSettingMetadata,
  UndefinedUiSettingMetadata,
  UiSettingMetadata,
  KnownTypeToMetadata,
  UiSetting,
} from './metadata';

export type {
  ArrayUnsavedFieldChange,
  BooleanUnsavedFieldChange,
  ColorUnsavedFieldChange,
  ImageUnsavedFieldChange,
  JsonUnsavedFieldChange,
  MarkdownUnsavedFieldChange,
  NumberUnsavedFieldChange,
  SelectUnsavedFieldChange,
  StringUnsavedFieldChange,
  UndefinedUnsavedFieldChange,
  UnsavedFieldChange,
} from './unsaved_change';

export type {
  ArraySettingType,
  BooleanSettingType,
  KnownTypeToValue,
  NumberSettingType,
  SettingType,
  StringSettingType,
  UndefinedSettingType,
  Value,
} from './setting_type';

/**
 * A React `ref` that indicates an input can be reset using an
 * imperative handle.
 */
export type ResetInputRef = {
  reset: () => void;
} | null;

/**
 * A function that is called when the value of a {@link FieldInput} changes.
 * @param change The {@link UnsavedFieldChange} passed to the handler.
 */
export type OnChangeFn<T extends SettingType> = (change?: UnsavedFieldChange<T>) => void;
