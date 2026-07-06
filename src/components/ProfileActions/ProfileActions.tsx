"use client";
import { theme } from "@/styles/theme.yak";

import { siteConfig } from "@/config/site";
import ButtonToDialog from "@/components/ButtonToDialog";
import EncodedEmailLink from "@/components/EncodedEmailLink";
import SubmitButton from "@/components/SubmitButton";

import { styled } from "next-yak";
import { useTranslations } from "next-intl";
import { sharedInsetListStyles } from "@/styles/commonStyles";

const List = styled.ul`
  ${sharedInsetListStyles};
  gap: calc(${theme.spacing.unit} * 5);
`;

const ListItem = styled.li`
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
`;

const ListItemText = styled.div`
  flex: 1;
  & > h4 {
    color: ${theme.colors.text.ui.primary};
    font-weight: 500;
  }
  & > p {
    color: ${theme.colors.text.ui.quaternary};
    font-size: 0.875rem;
  }
`;

const ActionForm = styled.form`
  flex-shrink: 0;
`;

type ProfileActionsProps = {
  listings?: unknown[];
  signOutAction: React.FormHTMLAttributes<HTMLFormElement>["action"];
  deleteAccountAction: React.FormHTMLAttributes<HTMLFormElement>["action"];
};

export default function ProfileActions({
  listings = [],
  signOutAction,
  deleteAccountAction,
}: ProfileActionsProps) {
  const t = useTranslations();

  return (
    <List>
      <ListItem>
        <ListItemText>
          <h4>{t("Profile.actions.signOutTitle")}</h4>
          <p>{t("Profile.actions.signOutDescription")}</p>
        </ListItemText>
        <ActionForm action={signOutAction}>
          <SubmitButton
            variant="secondary"
            pendingText={t("Status.signingOut")}
          >
            {t("Actions.signOut")}
          </SubmitButton>
        </ActionForm>
      </ListItem>

      <ListItem>
        <ListItemText>
          <h4>{t("Profile.actions.exportTitle")}</h4>
          <p>{t("Profile.actions.exportDescription")}</p>
        </ListItemText>
        <ButtonToDialog
          variant="secondary"
          initialButtonText={t("Actions.exportData")}
          dialogTitle={t("Profile.actions.exportDialogTitle")}
          cancelButtonText={t("Actions.done")}
        >
          {t.rich("Profile.actions.exportDialog", {
            link: (chunks) => (
              <EncodedEmailLink address={siteConfig.encodedEmail.team}>
                {chunks}
              </EncodedEmailLink>
            ),
          })}
        </ButtonToDialog>
      </ListItem>

      <ListItem>
        <ListItemText>
          <h4>{t("Profile.actions.deleteTitle")}</h4>
          <p>
            {t("Profile.actions.deleteDescription", {
              count: listings?.length ?? 0,
            })}
          </p>
        </ListItemText>
        <ButtonToDialog
          variant="danger"
          initialButtonText={t("Profile.actions.deleteTitle")}
          dialogTitle={t("Profile.actions.deleteTitle")}
          confirmButtonText={t("Profile.actions.deleteConfirm", {
            count: listings?.length ?? 0,
          })}
          confirmLoadingText={t("Status.deleting")}
          action={deleteAccountAction}
        >
          {t("Profile.actions.deleteDialog", {
            count: listings?.length ?? 0,
          })}
        </ButtonToDialog>
      </ListItem>
    </List>
  );
}
