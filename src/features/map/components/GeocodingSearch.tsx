"use client";

import {
  forwardRef,
  useId,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { X } from "lucide-react";
import { css, styled } from "next-yak";
import type { BBox, GeocodingFeature, Position } from "@maptiler/client";

import { theme } from "@/styles/theme.yak";
import {
  MAP_GEOCODING_MIN_QUERY_LENGTH,
  useGeocodingSearch,
} from "../hooks/useGeocodingSearch";

export type GeocodingSearchHandle = {
  blur: () => void;
  clear: () => void;
  focus: () => void;
  setQuery: (query: string) => void;
};

type GeocodingSearchVariant = "inline" | "palette";

type GeocodingSearchProps = {
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaInvalid?: "true" | "false";
  autoFocus?: boolean;
  bbox?: BBox;
  clearLabel: string;
  countryCode?: string | null;
  error?: string;
  errorMessage: string;
  inputTestId?: string;
  loadingMessage: string;
  noResultsMessage: string;
  onBlur?: () => void;
  onClear?: () => void;
  onFocus?: () => void;
  onPick: (feature: GeocodingFeature) => void;
  onStatusMessageChange?: (message: string) => void;
  placeholder: string;
  proximity?: Position | "ip";
  variant?: GeocodingSearchVariant;
};

const Root = styled.div<{
  $error?: boolean;
  $variant: GeocodingSearchVariant;
}>`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;

  input {
    border-radius: calc(${theme.corners.base} * 0.5);
    font-size: ${({ $variant }) =>
      $variant === "palette" ? "1.0625rem" : "1rem"};
    min-height: 3.5rem;
    padding-inline: ${({ $variant }) =>
      $variant === "palette" ? "1rem 2.75rem" : "0.75rem 2.625rem"};

    ${({ $error }) =>
      $error &&
      css`
        border-color: ${theme.colors.input.invalid.border};
        border-width: 2px;
        background-color: hsla(22, 87%, 50%, 0.0625);
      `}
  }
`;

const InputWrap = styled.div`
  position: relative;
`;

const Input = styled.input`
  width: 100%;
  appearance: none;
  color: ${theme.colors.text.ui.secondary};
  border: 1px solid ${theme.colors.border.stark};
  background-color: ${theme.colors.background.slight};
  box-shadow: inset 0 -3px 2px 0 rgba(0, 0, 0, 0.03);
  line-height: 1.35;
  outline: none;

  &::placeholder {
    color: ${theme.colors.input.placeholder.text};
  }

  &:focus {
    outline: 2px solid ${theme.colors.border.focus};
    outline-offset: 2px;
  }
`;

const ClearButton = styled.button`
  appearance: none;
  border: 0;
  background: transparent;
  color: ${theme.colors.text.ui.tertiary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  position: absolute;
  right: 0.375rem;
  top: 50%;
  transform: translateY(-50%);
  border-radius: 0.7rem;

  &:hover {
    background: ${theme.colors.background.sunk};
  }

  &:focus-visible {
    outline: 3px solid ${theme.colors.focus.outline};
  }
`;

const ResultsPanel = styled.div<{ $variant: GeocodingSearchVariant }>`
  box-sizing: border-box;
  position: absolute;
  z-index: 4;
  left: 0;
  right: 0;
  top: calc(100% + 0.25rem);
  overflow: hidden;
  background: ${theme.colors.background.top};
  border: 1px solid ${theme.colors.border.base};
  border-radius: calc(${theme.corners.base} * 0.5);
  box-shadow: 0 5px 10px #33335926;

  ${({ $variant }) =>
    $variant === "palette" &&
    css`
      position: static;
      margin-top: 0.75rem;
      max-height: min(45vh, 24rem);
      overflow-y: auto;
    `}
`;

const StatusMessage = styled.div<{ $visible?: boolean }>`
  max-height: ${({ $visible }) => ($visible ? "3rem" : "0")};
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  overflow: hidden;
  transform: translateY(${({ $visible }) => ($visible ? "0" : "-0.25rem")});
  transition:
    max-height 160ms ease,
    opacity 140ms ease,
    transform 160ms ease;
  color: ${theme.colors.text.tertiary};
  font-size: 0.875rem;
  line-height: 1.35;
  padding: ${({ $visible }) => ($visible ? "0.625rem 1rem 0" : "0 1rem")};
  pointer-events: none;
  text-align: center;
  text-wrap: balance;
`;

const ResultList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
`;

const ResultOption = styled.li<{ $active?: boolean }>`
  appearance: none;
  width: 100%;
  border: 0;
  background: ${({ $active }) =>
    $active ? theme.colors.background.sunk : theme.colors.background.top};
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.75rem 1rem;
  text-align: left;
  transition: background-color 100ms ease-in-out;

  &:hover,
  &:focus-visible {
    background: ${theme.colors.background.sunk};
    outline: none;
  }
`;

const ResultPrimary = styled.span`
  color: ${theme.colors.text.primary};
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
`;

const ResultSecondary = styled.span`
  color: ${theme.colors.text.secondary};
  font-size: 0.875rem;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

function getFeaturePrimaryLabel(feature: GeocodingFeature) {
  return feature.matching_text || feature.text || feature.place_name;
}

function getFeatureSecondaryLabel(feature: GeocodingFeature) {
  return feature.matching_place_name || feature.place_name;
}

function getFeatureInputLabel(feature: GeocodingFeature) {
  return feature.place_name || feature.text;
}

const GeocodingSearch = forwardRef<GeocodingSearchHandle, GeocodingSearchProps>(
  function GeocodingSearch(
    {
      id,
      ariaLabel,
      ariaLabelledBy,
      ariaInvalid,
      autoFocus,
      bbox,
      clearLabel,
      countryCode,
      error,
      errorMessage,
      inputTestId = "geocoding-search-input",
      loadingMessage,
      noResultsMessage,
      onBlur,
      onClear,
      onFocus,
      onPick,
      onStatusMessageChange,
      placeholder,
      proximity,
      variant = "inline",
    },
    forwardedRef
  ) {
    const generatedId = useId();
    const inputId = id ?? `${generatedId}-geocoding-search`;
    const listId = `${inputId}-results`;
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const hasSearchableQuery =
      query.trim().length >= MAP_GEOCODING_MIN_QUERY_LENGTH;
    const canShowResults = variant === "palette" || isFocused;
    const showResults = hasSearchableQuery && canShowResults;
    const { features, isError, isLoading, isReady } = useGeocodingSearch({
      query,
      bbox,
      countryCode,
      enabled: showResults,
      proximity,
    });
    const hasVisibleListbox = showResults && features.length > 0;
    const showNoResults =
      showResults && isReady && !isLoading && !isError && features.length === 0;
    const statusMessage = showResults
      ? isLoading
        ? loadingMessage
        : isError
          ? errorMessage
          : showNoResults
            ? noResultsMessage
            : ""
      : "";
    const shouldRenderStatusMessage =
      variant === "palette" || !onStatusMessageChange;
    const activeFeature = showResults ? features[activeIndex] : undefined;

    useEffect(() => {
      onStatusMessageChange?.(statusMessage);
    }, [onStatusMessageChange, statusMessage]);

    useEffect(() => {
      if (activeIndex >= features.length) {
        setActiveIndex(0);
      }
    }, [activeIndex, features.length]);

    useImperativeHandle(
      forwardedRef,
      () => ({
        blur: () => {
          setIsFocused(false);
          inputRef.current?.blur();
        },
        clear: () => {
          setQuery("");
          setActiveIndex(0);
          onClear?.();
        },
        focus: () => inputRef.current?.focus(),
        setQuery: (nextQuery: string) => {
          setQuery(nextQuery);
          setActiveIndex(0);
        },
      }),
      [onClear]
    );

    const pickFeature = (feature: GeocodingFeature) => {
      setQuery(getFeatureInputLabel(feature));
      setActiveIndex(0);
      setIsFocused(false);
      inputRef.current?.blur();
      onPick(feature);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (!features.length) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % features.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(
          (index) => (index - 1 + features.length) % features.length
        );
      } else if (event.key === "Enter" && activeFeature) {
        event.preventDefault();
        pickFeature(activeFeature);
      }
    };

    return (
      <Root $error={Boolean(error)} $variant={variant}>
        <InputWrap>
          <Input
            ref={inputRef}
            id={inputId}
            data-testid={inputTestId}
            value={query}
            autoFocus={autoFocus}
            placeholder={placeholder}
            aria-autocomplete="list"
            aria-controls={hasVisibleListbox ? listId : undefined}
            aria-expanded={hasVisibleListbox}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-invalid={ariaInvalid}
            aria-activedescendant={
              activeFeature ? `${listId}-option-${activeIndex}` : undefined
            }
            role="combobox"
            onBlur={() => {
              setIsFocused(false);
              onBlur?.();
            }}
            onChange={(event) => {
              const nextQuery = event.target.value;
              const normalisedQuery = nextQuery.trim() ? nextQuery : "";
              setQuery(normalisedQuery);
              setActiveIndex(0);
              if (!normalisedQuery) {
                onClear?.();
              }
            }}
            onFocus={() => {
              setIsFocused(true);
              onFocus?.();
            }}
            onKeyDown={handleKeyDown}
          />
          {query ? (
            <ClearButton
              type="button"
              aria-label={clearLabel}
              onClick={() => {
                setQuery("");
                setActiveIndex(0);
                onClear?.();
                inputRef.current?.focus();
              }}
            >
              <X size={16} aria-hidden="true" />
            </ClearButton>
          ) : null}
        </InputWrap>

        {shouldRenderStatusMessage ? (
          <StatusMessage
            aria-live="polite"
            role="status"
            $visible={Boolean(statusMessage)}
          >
            {statusMessage}
          </StatusMessage>
        ) : null}

        {hasVisibleListbox ? (
          <ResultsPanel $variant={variant}>
            <ResultList id={listId} role="listbox">
              {features.map((feature, index) => (
                <ResultOption
                  key={feature.id}
                  id={`${listId}-option-${index}`}
                  role="option"
                  tabIndex={-1}
                  $active={index === activeIndex}
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pickFeature(feature)}
                >
                  <ResultPrimary>
                    {getFeaturePrimaryLabel(feature)}
                  </ResultPrimary>
                  <ResultSecondary>
                    {getFeatureSecondaryLabel(feature)}
                  </ResultSecondary>
                </ResultOption>
              ))}
            </ResultList>
          </ResultsPanel>
        ) : null}
      </Root>
    );
  }
);

export default GeocodingSearch;
