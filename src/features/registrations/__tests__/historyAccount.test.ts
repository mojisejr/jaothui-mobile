import React from "react";
import { RegistrationHistoryScreen } from "../RegistrationHistoryScreen";
import { FormSelect } from "../FormControls";
let mockResource: Record<string, unknown>;
jest.mock("@/features/events/useEventResource", () => ({ useEventResource: () => mockResource }));
jest.mock("expo-router", () => ({ useFocusEffect: jest.fn(), useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock("../CustomerGate", () => ({ CustomerGate: () => null }));
jest.mock("@/components/Screen", () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const renderer = require("react-test-renderer") as { act: (callback: () => void) => void; create: (element: React.ReactElement) => { root: { findByType: (type: unknown) => { props: { options: string[] } } }; update: (element: React.ReactElement) => void; unmount: () => void } };
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
