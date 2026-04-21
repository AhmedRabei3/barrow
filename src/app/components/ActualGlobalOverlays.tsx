"use client";

import ChunkErrorRecovery from "./ChunkErrorRecovery";
import FloatingChatButton from "./FloatingChatButton";
import ScrollToTopButton from "./ScrollToTopButton";
import Countdown from "./countdown/Countdown";
import ActivationModal from "./modals/(activationModal)/ActivationModal";
import RegisterModal from "./modals/(register)/RegisterModal";
import LoginParamHandler from "./modals/LoginParamHandler";
import LoginModal from "./modals/LoginModal";
import InviteModal from "./modals/inviteModal/InviteModal";
import ReferralHandler from "./modals/referalCatcher/ReferralHandler";
import SearchModal from "./modals/searchModal/SearchModal";

export default function ActualGlobalOverlays() {
  return (
    <>
      <ChunkErrorRecovery />
      <ReferralHandler />
      <LoginParamHandler />
      <LoginModal />
      <InviteModal />
      <RegisterModal />
      <FloatingChatButton />
      <ScrollToTopButton />
      <SearchModal />
      <ActivationModal />
      <Countdown />
    </>
  );
}
