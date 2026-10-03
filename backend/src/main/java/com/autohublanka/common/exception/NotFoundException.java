package com.autohublanka.common.exception;

/** 404 - the requested record does not exist. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }

    public static NotFoundException of(String entity, Object id) {
        return new NotFoundException(entity + " not found with id " + id);
    }
}
