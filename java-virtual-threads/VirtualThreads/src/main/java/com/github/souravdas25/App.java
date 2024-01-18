package com.github.souravdas25;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.apache.http.NameValuePair;
import org.apache.http.client.utils.URLEncodedUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Hello world!
 */
public class App {

    private static final Logger LOGGER = LoggerFactory.getLogger(App.class);

    public static void main(String[] args) throws Exception {
        int port = 8080;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        server.createContext("/health", exchange -> {
            String response = "success";
            exchange.sendResponseHeaders(200, response.length());
            OutputStream os = exchange.getResponseBody();
            os.write(response.getBytes());
            os.close();
        });

        server.createContext("/test-virtual", exchange -> {

            VirtualThreads virtualThreads = new VirtualThreads();
            try {
                List<NameValuePair> params = URLEncodedUtils.parse(exchange.getRequestURI(), StandardCharsets.UTF_8);
                int maxThreads = Integer.valueOf(params.get(0).getValue());
                virtualThreads.start(maxThreads);
            } catch (Exception e) {
                LOGGER.error("Interruption ", e);
            }

            String response = "success";
            exchange.sendResponseHeaders(200, response.length());
            OutputStream os = exchange.getResponseBody();
            os.write(response.getBytes());
            os.close();
        });

        server.setExecutor(null); // creates a default executor
        server.start();
        LOGGER.info("Server started on port: {}", port);
    }


}
