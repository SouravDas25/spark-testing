package com.github.souravdas25;

import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.IntStream;

/**
 * Hello world!
 */
public class App {

    private static final Logger LOGGER = LoggerFactory.getLogger(App.class);

    public static void main(String[] args) throws InterruptedException {

        LOGGER.info("Available processors: {}", Runtime.getRuntime().availableProcessors());

        try (ExecutorService executorService = Executors.newVirtualThreadPerTaskExecutor()) {

            // create 10 virtual threads
            IntStream.range(0, 100).forEach(i -> executorService.submit(() -> {
                LOGGER.info("Virtual thread is name: {} ", Thread.currentThread());
                LOGGER.info("Hello from virtual thread B4: #{}", i);
                // call google.com and print the response
                CloseableHttpClient httpClient = HttpClientBuilder.create().build();
                try {
                    httpClient.execute(new HttpGet("http://www.google.com"),
                            response -> {
                                int statusCode = response.getStatusLine().getStatusCode();
                                LOGGER.info("Status code #{}: {}", i, statusCode);
                                return null;
                            }
                    );
                } catch (IOException e) {
                    LOGGER.error("Error while calling google.com", e);
                }
                LOGGER.info("Hello from virtual thread AF: #{}", i);
                LOGGER.info("Virtual thread is name: {} ", Thread.currentThread());
            }));

            boolean b = executorService.awaitTermination(1, TimeUnit.SECONDS);
        }

    }
}
