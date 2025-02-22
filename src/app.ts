import { DatabaseService } from './database';
import { WhatsAppService } from './services/whatsapp.service';
import { AuthMiddleware } from './middleware/auth.middleware';
import { TenantMiddleware } from './middleware/tenant.middleware';
import { TenantController } from './controllers/tenant.controller';
import { MessageController } from './controllers/message.controller';
import { config } from './config';
import { serve } from "bun";
import { fileURLToPath } from "url";

type BunResponse = {
    status: number;
    headers: Record<string, string>;
    body: any;
};

class ResponseBuilder {
    private response: BunResponse = {
        status: 200,
        headers: {},
        body: null
    };

    status(code: number) {
        this.response.status = code;
        return this;
    }

    json(data: any) {
        this.response.body = data;
        return this.toBunResponse();
    }

    private toBunResponse(): Response {
        return new Response(
            JSON.stringify(this.response.body),
            {
                status: this.response.status,
                headers: {
                    "Content-Type": "application/json",
                    ...this.response.headers
                }
            }
        );
    }

    setCorsHeaders(origins: string | string[]) {
        const origin = Array.isArray(origins) ? origins.join(", ") : origins;
        this.response.headers = {
            ...this.response.headers,
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key"
        };
        return this;
    }
}

export const createApp = async () => {
    const db = new DatabaseService();
    await db.init().catch(console.error);
    
    const whatsappService = new WhatsAppService(db);
    const tenantController = new TenantController(db, whatsappService);
    const messageController = new MessageController(db, whatsappService);
    const authMiddleware = new AuthMiddleware();
    const tenantMiddleware = new TenantMiddleware(db);

    return serve({
        port: config.port,
        async fetch(req) {
            const url = new URL(req.url);
            const path = url.pathname;
            const response = new ResponseBuilder().setCorsHeaders(config.allowedOrigins);

            if (req.method === "OPTIONS") {
                return response.json(null);
            }

            // Serve static files
            if (path === "/" || path === "/index.html") {
                try {
                    const filePath = fileURLToPath(new URL("../public/index.html", import.meta.url));
                    const file = Bun.file(filePath);
                    if (await file.exists()) {
                        return new Response(file, {
                            headers: {
                                "Content-Type": "text/html"
                            }
                        });
                    }
                } catch (error) {
                    console.error("Error serving index.html:", error);
                }
            }

            // Auth check for API routes
            if (path.startsWith("/api")) {
                const apiKey = req.headers.get("x-api-key");
                if (!apiKey || apiKey !== config.apiKey) {
                    return response.status(401).json({
                        status: "error",
                        message: "Unauthorized"
                    });
                }
            }

            try {
                // Parse JSON body for non-GET requests
                let body;
                if (req.method !== "GET" && req.headers.get("content-type")?.includes("application/json")) {
                    body = await req.json();
                }

                // Route handlers
                if (path.startsWith("/api/tenants")) {
                    const tenantId = url.pathname.split("/")[3];

                    if (path === "/api/tenants" && req.method === "GET") {
                        const result = await tenantController.listTenants(
                            { method: req.method, params: {}, headers: Object.fromEntries(req.headers) } as any,
                            response as any
                        );
                        return result instanceof Response ? result : response.json(result);
                    }

                    // Tenant check middleware for protected routes
                    if (tenantId) {
                        const tenant = await tenantMiddleware.checkTenant(
                            { method: req.method, params: { tenantId }, headers: Object.fromEntries(req.headers) } as any,
                            response as any,
                            () => {}
                        );
                        
                        if (!tenant) {
                            return response.status(404).json({
                                status: "error",
                                message: "Tenant not found"
                            });
                        }

                        // Add tenant to request for message routes
                        (req as any).tenant = tenantId;
                    }

                    // Protected tenant routes
                    switch (req.method) {
                        case "POST":
                            return response.status(201).json(await tenantController.createTenant(
                                { method: req.method, params: { tenantId }, body, headers: Object.fromEntries(req.headers) } as any,
                                response as any
                            ));
                        case "GET":
                            if (path.endsWith("/status")) {
                                return response.json(await tenantController.getTenantStatus(
                                    { method: req.method, params: { tenantId }, headers: Object.fromEntries(req.headers) } as any,
                                    response as any
                                ));
                            } else if (path.endsWith("/qr")) {
                                return response.json(await tenantController.getQrCode(
                                    { method: req.method, params: { tenantId }, headers: Object.fromEntries(req.headers) } as any,
                                    response as any
                                ));
                            }
                            break;
                        case "DELETE":
                            return response.json(await tenantController.deleteTenant(
                                { method: req.method, params: { tenantId }, headers: Object.fromEntries(req.headers) } as any,
                                response as any
                            ));
                    }
                }

                // Handle message routes
                if (path === "/api/send-message" && req.method === "POST") {
                    const tenantId = req.headers.get("x-tenant-id");
                    if (!tenantId) {
                        return response.status(400).json({
                            status: "error",
                            message: "Tenant ID is required"
                        });
                    }

                    const result = await messageController.sendMessage(
                        { 
                            method: req.method, 
                            body, 
                            headers: Object.fromEntries(req.headers),
                            tenant: tenantId
                        } as any,
                        response as any
                    );
                    return result instanceof Response ? result : response.json(result);
                }

                // Handle 404 for unmatched routes
                return response.status(404).json({
                    status: "error",
                    message: "Not Found"
                });
            } catch (error) {
                console.error("Server error:", error);
                return response.status(500).json({
                    status: "error",
                    message: "Internal Server Error"
                });
            }
        }
    });
};