import { styled } from "next-yak";
import { theme } from "@/styles/theme.yak";
import type { HTMLAttributes, ReactNode } from "react";

type AboveTheFoldSectionProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
};

function AboveTheFoldSection({ children, ...props }: AboveTheFoldSectionProps) {
  return <Section {...props}>{children}</Section>;
}

export default AboveTheFoldSection;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: ${theme.spacing.container.maxWidth.media};
  gap: ${theme.spacing.gap.section.md};

  @media (min-width: 768px) {
    gap: ${theme.spacing.gap.section.lg};
  }
`;
