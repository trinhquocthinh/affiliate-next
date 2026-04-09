"use client";

import { createContext, useContext, type ReactNode } from "react";

type ActorContextValue = {
  role: "BUYER" | "AFFILIATE" | "ADMIN";
  isAdmin: boolean;
  isAffiliate: boolean;
  isBuyer: boolean;
  displayName: string | null;
  email: string;
};

const ActorContext = createContext<ActorContextValue>({
  role: "BUYER",
  isAdmin: false,
  isAffiliate: false,
  isBuyer: true,
  displayName: null,
  email: "",
});

export function ActorProvider({
  children,
  role,
  displayName,
  email,
}: {
  children: ReactNode;
  role: "BUYER" | "AFFILIATE" | "ADMIN";
  displayName: string | null;
  email: string;
}) {
  return (
    <ActorContext.Provider
      value={{
        role,
        isAdmin: role === "ADMIN",
        isAffiliate: role === "AFFILIATE" || role === "ADMIN",
        isBuyer: role === "BUYER" || role === "ADMIN",
        displayName,
        email,
      }}
    >
      {children}
    </ActorContext.Provider>
  );
}

export function useActor() {
  return useContext(ActorContext);
}
