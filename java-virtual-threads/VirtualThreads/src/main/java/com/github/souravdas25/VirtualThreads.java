package com.github.souravdas25;

import org.apache.http.client.methods.HttpGet;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;

public class VirtualThreads {

    private static final Logger LOGGER = LoggerFactory.getLogger(VirtualThreads.class);

    public double start(int maxThreads) {
        Instant start = Instant.now();
        LOGGER.info("Available processors: {}", Runtime.getRuntime().availableProcessors());

        try (ExecutorService executorService = Executors.newVirtualThreadPerTaskExecutor()) {
            // create 10 virtual threads
            new CommonTestCase().testcase(maxThreads, executorService);
            LOGGER.info("submitted");
        } finally {
            LOGGER.info("executor closed");
        }
        Instant end = Instant.now();
        double timeTaken = Duration.between(start, end).toMillis() / 1000.0;
        LOGGER.info("Time Elapsed : {} sec", timeTaken);
        return timeTaken;
    }

    public static void main(String[] arg) {
        Double sum = 0.0;
        int readings = 1;
        for (int i = 0; i < readings; i++) {
            VirtualThreads virtualThreads = new VirtualThreads();
            sum += virtualThreads.start(100);
        }
        LOGGER.info("Time Avg : {} sec", sum / readings);
    }
}
