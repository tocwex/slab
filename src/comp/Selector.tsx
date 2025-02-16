"use client";
import React, { useRef, forwardRef } from 'react';
import {
  components,
  ControlProps,
  OptionProps,
  MenuProps,
  MenuListProps,
  NoticeProps,
  InputProps,
  PlaceholderProps,
  SingleValue,
  SingleValueProps,
  MultiValueRemoveProps,
  MultiValueGenericProps,
  MultiValue,
  ActionMeta,
  ValueContainerProps,
  ClearIndicatorProps,
  InputActionMeta,
  Props as SelectProps,
  Theme as SelectTheme,
  GroupBase,
  CSSObjectWithLabel as StylesBase,
} from 'react-select';
import Select from 'react-select';
import merge from 'lodash.merge';
// import { CreatableProps as CreatableSelectProps } from 'react-select/creatable';
// import CreatableSelect from 'react-select/creatable';

export interface SelectorOption {
  value: string;
  label: string;
}
export type SingleSelection = SingleValue<SelectorOption>;
export type SelectorProps<IsMulti extends boolean> =
  SelectProps<SelectorOption, IsMulti, GroupBase<SelectorOption>>;
export type SingleSelectorProps = SelectorProps<false>;
export type MultiSelectorProps = SelectorProps<true>;
// export type CreatableSelectorProps<IsMulti extends boolean> =
//   CreatableSelectProps<SelectorOption, IsMulti, GroupBase<SelectorOption>>;
// export type SingleCreatableSelectorProps = CreatableSelectorProps<false>;
// export type MultiCreatableSelectorProps = CreatableSelectorProps<true>;

const DEFAULT_PROPS = {
  placeholder: "",
  autoFocus: false,
  isClearable: true,
  isLoading: false,
  isSearchable: true,
};
const OVERRIDE_PROPS = {
  menuShouldScrollIntoView: false,
  hideSelectedOptions: false,
  hasPrompt: false,
  classNames: {
    control: (state: ControlProps<SelectorOption, true>) => "font-bold",
    input: (state: InputProps<SelectorOption, true>) => "px-2 py-1",
    placeholder: (state: PlaceholderProps<SelectorOption, true>) => "px-2 py-1",
    singleValue: (state: SingleValueProps<SelectorOption, true>) => "px-2 py-1",
    menu: (state: MenuProps<SelectorOption, true>) => "border border-gray-500",
  },
  styles: {
    menu: (style: StylesBase) => ({
      ...style,
      width: "max-content",
      minWidth: "100%",
    }),
  },
  theme: (theme: SelectTheme) => ({
    ...theme,
    borderRadius: 0,
    colors: {
      ...theme.colors,
      neutral0: "var(--color-black)",
      neutral10: "var(--color-white)",
      neutral20: "var(--color-white)",
      neutral30: "var(--color-white)",
      neutral40: "var(--color-gray-500)",
      neutral50: "var(--color-gray-500)",
      neutral60: "var(--color-gray-500)",
      neutral70: "var(--color-gray-500)",
      neutral80: "var(--color-white)",
      neutral90: "var(--color-white)",
      primary: "var(--color-white)",
      primary25: "var(--color-gray-500)",
      primary50: "var(--color-gray-500)",
      primary75: "var(--color-gray-500)",
    },
  }),
};

export const SingleSelector = forwardRef<
  any,
  SingleSelectorProps
>((props, ref) => (
  <Select
    ref={ref}
    isMulti={false}
    {...merge({}, DEFAULT_PROPS, props, OVERRIDE_PROPS)}
  />
));

export const MultiSelector = forwardRef<
  any,
  MultiSelectorProps
>((props, ref) => (
  <Select
    ref={ref}
    isMulti={true}
    {...merge({}, DEFAULT_PROPS, props, OVERRIDE_PROPS)}
  />
));
