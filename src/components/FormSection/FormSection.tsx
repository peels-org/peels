import { styled } from "next-yak";
import { theme } from "@/styles/theme.yak";
import { sharedSectionHeadingStyles } from "@/styles/commonStyles";
import type { ComponentPropsWithoutRef, PropsWithChildren } from "react";

const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  &:not(:last-of-type) {
    padding-bottom: 2rem;
    border-bottom: 1px solid ${theme.colors.border.base};
  }

  & h2 {
    ${sharedSectionHeadingStyles};
  }
`;

type FormSectionProps = PropsWithChildren<ComponentPropsWithoutRef<"section">>;

function FormSection({ children, ...props }: FormSectionProps) {
  return <StyledSection {...props}>{children}</StyledSection>;
}

export default FormSection;
