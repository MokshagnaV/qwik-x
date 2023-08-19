import { component$, Slot } from "@builder.io/qwik";
import { globalAction$, routeLoader$, z, zod$ } from "@builder.io/qwik-city";
import { MetaSidebar } from "~/components/meta-sidebar";
import { Sidebar } from "~/components/sidebar";
import type { AuthUser } from "~/types";
import { handleLogout } from "~/utils/auth";
import { handleCreatePost } from "~/utils/posts";

export const useCurrentUser = routeLoader$(({ sharedMap }) => {
  const user = sharedMap.get("user") as AuthUser | undefined;
  return user;
});

export const useLogout = globalAction$(async (_, requestEvent) => {
  return handleLogout(requestEvent);
});

export const useCreatePost = globalAction$(
  async (formData, requestEvent) => {
    console.log(formData);
    return handleCreatePost(formData, requestEvent);
  },
  zod$({
    text: z.string().optional(),
    visibility: z.string().optional(),
    replyPrivacy: z.string().optional(),
  })
);
export default component$(() => {
  return (
    <div class="relative container max-w-7xl mx-auto">
      <Sidebar />

      <main class="ml-64">
        <div class="grid grid-cols-12 divide-x min-h-screen h-full">
          <div class="col-span-7">
            <Slot />
          </div>
          <div class="col-span-5">
            <MetaSidebar />
          </div>
        </div>
      </main>
    </div>
  );
});
