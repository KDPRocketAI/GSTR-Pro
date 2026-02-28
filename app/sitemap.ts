import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://www.gstdesk.online";

    const routes = [
        "",
        "/login",
        "/signup",
        "/dashboard",
        "/gstr1",
        "/history",
        "/profiles",
        "/settings",
        "/upgrade",
    ];

    return routes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: route === "" ? 1 : 0.8,
    }));
}
