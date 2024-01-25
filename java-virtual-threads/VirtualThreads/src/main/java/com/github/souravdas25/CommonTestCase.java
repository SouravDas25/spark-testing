package com.github.souravdas25;

import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.stream.IntStream;

public class CommonTestCase {

    private static final Logger LOGGER = LoggerFactory.getLogger(CommonTestCase.class);

    public void testcase(int maxThreads, ExecutorService executorService) {
        IntStream.range(0, maxThreads).forEach(i -> executorService.submit(() -> {
            LOGGER.info("Platform thread is name B4 #{}: {} ", i, Thread.currentThread());
            // call google.com and print the response
            try (CloseableHttpClient httpClient = HttpClientBuilder.create().build()) {
                httpClient.execute(new HttpGet("https://hub.dummyapis.com/delay?seconds=1"),
                        response -> {
                            int statusCode = response.getStatusLine().getStatusCode();
                            LOGGER.info("Status code #{}: {}", i, statusCode);
                            return null;
                        }
                );
            } catch (IOException e) {
                LOGGER.error("Error while calling uri", e);
            }
            LOGGER.info("Hello from Platform thread AF: #{}", i);
            LOGGER.info("Platform thread is name: {} ", Thread.currentThread());
        }));
    }

}
