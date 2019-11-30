rust_MODE ?= release
CARGO_FLAGS=$(if $(filter release,$(rust_MODE)),--release,)

STEPS = step0_repl step1_read_print step2_eval step3_env step4_if_fn_do \
		step5_tco step6_file step7_quote step8_macros step9_try stepA_mal
BINS = $(foreach x,$(STEPS),target/$(rust_MODE)/$(x))

.PHONY: all clean $(BINS)

all:
	cargo build $(CARGO_FLAGS)

$(BINS):
	cargo build $(CARGO_FLAGS) --bin $(notdir $@)

clean:
	cargo clean
