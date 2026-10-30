import { RegistrationScreen } from "@/features/registrations/RegistrationScreen";
export function RegistrationEntryScreen({ member = false }: { member?: boolean }) { return <RegistrationScreen memberMode={member} />; }
