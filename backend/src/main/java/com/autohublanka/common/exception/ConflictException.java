package com.autohublanka.common.exception;

/**
 * 409 - the request conflicts with existing data
 * (duplicate value, record still in use, wrong status...).
 */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
