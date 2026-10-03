package com.autohublanka.support;

import com.autohublanka.common.exception.BusinessException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * SINGLETON pattern - one shared bad-word filter for reviews and feedback.
 * <ol>
 *   <li>private constructor: nobody else can do {@code new ContentFilter()}; it loads the word list once</li>
 *   <li>{@code private static ContentFilter instance}: the only object</li>
 *   <li>{@code public static synchronized getInstance()}: creates it on first use and always returns the same one</li>
 * </ol>
 * Written as a plain Java class (not a Spring bean) so the pattern is visible.
 */
public final class ContentFilter {

    private static final String WORD_LIST = "banned-words.txt";

    private static ContentFilter instance;

    private final Set<String> bannedWords;

    private ContentFilter() {
        this.bannedWords = Collections.unmodifiableSet(load());
    }

    public static synchronized ContentFilter getInstance() {
        if (instance == null) {
            instance = new ContentFilter();
        }
        return instance;
    }

    /** The banned words found in the text (empty list = text is fine). */
    public List<String> check(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        Set<String> found = new LinkedHashSet<>();
        for (String word : text.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+")) {
            if (bannedWords.contains(word)) {
                found.add(word);
            }
        }
        return List.copyOf(found);
    }

    /** Throws a 400 error listing the words to remove, if any of the texts contains one. */
    public void requireClean(String... texts) {
        Set<String> found = new LinkedHashSet<>();
        for (String text : texts) {
            found.addAll(check(text));
        }
        if (!found.isEmpty()) {
            throw new BusinessException("Please remove inappropriate words: " + String.join(", ", found));
        }
    }

    public int size() {
        return bannedWords.size();
    }

    private static Set<String> load() {
        Set<String> words = new LinkedHashSet<>();
        InputStream in = ContentFilter.class.getClassLoader().getResourceAsStream(WORD_LIST);
        if (in == null) {
            return words;
        }
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            reader.lines()
                    .map(String::trim)
                    .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                    .map(line -> line.toLowerCase(Locale.ROOT))
                    .forEach(words::add);
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not read " + WORD_LIST, ex);
        }
        return words;
    }
}
