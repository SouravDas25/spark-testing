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

public class PlainThreads {

    private static final Logger LOGGER = LoggerFactory.getLogger(PlainThreads.class);

    public static double start(int maxThreads) {
        Instant start = Instant.now();
        LOGGER.info("Available processors: {}", Runtime.getRuntime().availableProcessors());

        try (ExecutorService executorService = Executors.newFixedThreadPool(52)) {
            new CommonTestCase().testcase(maxThreads, executorService);
        }
        Instant end = Instant.now();
        double timeTaken = Duration.between(start, end).toMillis() / 1000.0;
        LOGGER.info("Time Elapsed : {} sec", timeTaken);
        return timeTaken;
    }

    public static void main(String[] arg) {
        Double sum = 0.0;
        int readings = 15;
        for (int i = 0; i < readings; i++) {
            sum += start(100);
        }
        LOGGER.info("Time Avg : {} sec", sum / readings);
    }
}
