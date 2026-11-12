import React from "react";
import { RegistrationHistoryScreen } from "../RegistrationHistoryScreen";
import { FormSelect } from "../FormControls";
import { NotificationInvitation } from "@/notifications/NotificationInvitation";
import { registration } from "./fixtures";
import { FlatList } from "react-native";
let mockResource: Record<string, unknown>;
jest.mock("../useRegistrationResource", () => ({ useRegistrationResource: () => mockResource }));
jest.mock("../ApplicantQrPanel", () => ({ ApplicantQrPanel: () => null }));
jest.mock("@/notifications/NotificationInvitation", () => ({ NotificationInvitation: () => null }));
jest.mock("expo-router", () => ({ useLocalSearchParams: () => ({}), useFocusEffect: jest.fn(), useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock("../CustomerGate", () => ({ CustomerGate: () => null }));
jest.mock("@/components/Screen", () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as { act: (callback: () => void) => void; create: (element: React.ReactElement) => { root: { findByType: (type: unknown) => { props: { options: string[]; ListHeaderComponent?: React.ReactElement } }; findAllByType: (type: unknown) => unknown[] }; update: (element: React.ReactElement) => void; unmount: () => void } };
it("drops previous account's event-title options immediately on loading/logout/error and replaces them for the next account", () => {
  mockResource = { status: "success", data: { session: { identity: { accountId: "first" } }, value: { eventNames: ["งานของบัญชีแรก"], items: [], nextCursor: null } } };
  let tree!: ReturnType<typeof renderer.create>;
  renderer.act(() => { tree = renderer.create(React.createElement(RegistrationHistoryScreen)); });
  expect(tree.root.findByType(FormSelect).props.options).toEqual(["", "งานของบัญชีแรก"]);
  for (const status of ["loading", "error"]) {
    mockResource = { status, data: null, error: new Error("session expired") };
    renderer.act(() => tree.update(React.createElement(RegistrationHistoryScreen)));
    expect(tree.root.findByType(FormSelect).props.options).toEqual([""]);
  }
  mockResource = { status: "success", data: { session: { identity: { accountId: "second" } }, value: { eventNames: ["งานของบัญชีใหม่"], items: [], nextCursor: null } } };
  renderer.act(() => tree.update(React.createElement(RegistrationHistoryScreen)));
  expect(tree.root.findByType(FormSelect).props.options).toEqual(["", "งานของบัญชีใหม่"]);
  renderer.act(() => tree.unmount());
});
it("places the invitation only on non-empty successfully loaded owned history", () => {
  const data = { session: { identity: { accountId: "current" } }, value: { eventNames: [], items: [registration], nextCursor: null } };
  mockResource = { status: "success", data };
  let tree!: ReturnType<typeof renderer.create>;
  renderer.act(() => { tree = renderer.create(React.createElement(RegistrationHistoryScreen)); });
  expect(tree.root.findAllByType(NotificationInvitation)).toHaveLength(1);
  expect(tree.root.findByType(FlatList).props.ListHeaderComponent?.type).toBe(NotificationInvitation);
  for (const value of [{ status: "loading", data: null }, { status: "error", data, error: new Error("failed") }, { status: "success", data: { ...data, value: { ...data.value, items: [] } } }]) {
    mockResource = value; renderer.act(() => tree.update(React.createElement(RegistrationHistoryScreen)));
    expect(tree.root.findAllByType(NotificationInvitation)).toHaveLength(0);
  }
  renderer.act(() => tree.unmount());
});
