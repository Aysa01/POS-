import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  TextInput,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Alert } from '../utils/dialogs';
import {
  Coffee,
  CreditCard,
  Edit3,
  ImagePlus,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  C,
  Empty,
  ErrorMessage,
  Field,
  Heading,
  IconButton,
  S,
  Sheet,
  errorText,
  showError,
} from "../components/ui";
import { OrderDetails } from "../components/OrderDetails";
import { ProductTile } from '../components/ProductTile';
import { checkout, reserveInvoice, saveProduct, deleteProduct } from "../database/db";
import { pickProductImage } from "../services/images";
import { usePOS } from "../store/usePOS";
import { money, parseMoney, totalItems } from "../utils/domain";
import { payments, type Order, type Payment, type Product } from "../types";

const productValidation = z.object({
  name: z.string().trim().min(1, "Enter a drink name.").max(80),
  description: z.string().max(500),
  price: z.string().refine((v) => {
    try {
      parseMoney(v);
      return true;
    } catch {
      return false;
    }
  }, "Use a non-negative amount with up to two decimals."),
});
type ProductForm = z.infer<typeof productValidation>;
function ProductEditor({
  product,
  visible,
  onClose,
}: {
  product: Product | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [image, setImage] = useState<string | null>(null),
    [available, setAvailable] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { control, reset, handleSubmit } = useForm<ProductForm>({
    resolver: zodResolver(productValidation),
    defaultValues: { name: "", description: "", price: "" },
  });
  useEffect(() => {
    if (visible) {
      reset({
        name: product?.name ?? "",
        description: product?.description ?? "",
        price: product ? (product.price / 100).toFixed(2) : "",
      });
      setImage(product?.image ?? null);
      setAvailable(product ? !!product.available : true);
      setError("");
    }
  }, [visible, product, reset]);
  const submit = handleSubmit(async (data) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await saveProduct(usePOS.getState().account!, {
        id: product?.id,
        name: data.name,
        description: data.description,
        price: parseMoney(data.price),
        available: available ? 1 : 0,
        image,
      });
      onClose();
      usePOS.getState().notify("Drink saved on this device.");
      await usePOS.getState().refresh();
    } catch (e) {
      setError(errorText(e));
      showError(e);
    } finally {
      setBusy(false);
    }
  });
  return (
    <Sheet
      title={product ? "Edit drink" : "Add a drink"}
      visible={visible}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <ErrorMessage message={error} />
      {image && (
        <Image
          source={{ uri: image }}
          accessibilityLabel="Selected drink photo"
          style={{ height: 160, borderRadius: 12 }}
        />
      )}
      <View style={S.wrap}>
        <Button
          icon={ImagePlus}
          label={image ? "Replace photo" : "Choose photo"}
          tone="secondary"
          disabled={busy}
          onPress={() =>
            void pickProductImage()
              .then((uri) => {
                if (uri) setImage(uri);
              })
              .catch(showError)
          }
        />
        {image && (
          <Button
            label="Remove photo"
            tone="ghost"
            disabled={busy}
            onPress={() => setImage(null)}
          />
        )}
      </View>
      {(["name", "price", "description"] as const).map((name) => (
        <Controller
          key={name}
          name={name}
          control={control}
          render={({ field, fieldState }) => (
            <Field
              label={
                name === "name"
                  ? "Drink name"
                  : name === "price"
                    ? "Price (PHP)"
                    : "Description (optional)"
              }
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType={name === "price" ? "decimal-pad" : "default"}
              multiline={name === "description"}
              maxLength={
                name === "name" ? 80 : name === "description" ? 500 : 10
              }
              editable={!busy}
            />
          )}
        />
      ))}
      <View style={[S.row, { justifyContent: "space-between" }]}>
        <View style={S.flex}>
          <Text style={S.text}>Available for orders</Text>
          <Text style={S.muted}>
            Unavailable drinks cannot be added at checkout.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Drink available"
          value={available}
          onValueChange={setAvailable}
          disabled={busy}
          trackColor={{ true: C.accent }}
        />
      </View>
      <Button label="Save drink" busy={busy} onPress={submit} />
      {!!product && <Button label="Delete drink" icon={Trash2} tone="danger" disabled={busy} onPress={() => Alert.alert('Remove this drink?', 'It will be removed from the menu. Past orders, receipts and audit records will be kept.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete drink', style: 'destructive', onPress: () => { void (async () => {
          setBusy(true);
          try {
            await deleteProduct(usePOS.getState().account!, product.id);
            usePOS.getState().remove(product.id);
            usePOS.getState().notify({ title: 'Drink removed', message: 'Historical orders and receipts are retained.' });
            await usePOS.getState().refresh();
            onClose();
          } catch (e) { setError(errorText(e)); showError(e); }
          finally { setBusy(false); }
        })(); } },
      ])} />}
    </Sheet>
  );
}

const checkoutValidation = z.object({
  customer: z.string().trim().min(1, "Enter the customer name.").max(100),
  staff: z.string().trim().min(1, "Enter the staff name.").max(100),
});
export function MenuScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const { products, cart, add, remove, quantity } = usePOS();
  const [manage, setManage] = useState(false),
    [editing, setEditing] = useState<Product | null>(null),
    [editor, setEditor] = useState(false);
  const [search, setSearch] = useState("");
  const [invoice, setInvoice] = useState<{
      id: number;
      invoice: string;
    } | null>(null),
    [reservationError, setReservationError] = useState("");
  const [payment, setPayment] = useState<Payment>("Cash"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<Order | null>(null),
    [lastOrder, setLastOrder] = useState<Order | null>(null),
    [success, setSuccess] = useState("");
  const processing = useRef(false),
    reserving = useRef(false);
  const { control, handleSubmit, reset } = useForm<
    z.infer<typeof checkoutValidation>
  >({
    resolver: zodResolver(checkoutValidation),
    defaultValues: { customer: "", staff: "" },
  });
  const reserve = async () => {
    if (reserving.current) return;
    reserving.current = true;
    setReservationError("");
    try {
      setInvoice(await reserveInvoice());
    } catch (e) {
      setReservationError(errorText(e));
    } finally {
      reserving.current = false;
    }
  };
  useEffect(() => {
    void reserve();
  }, []);
  let total = 0,
    totalError = "";
  if (cart.length) {
    try {
      total = totalItems(cart);
    } catch (e) {
      totalError = errorText(e);
    }
  }
  const submit = handleSubmit((values) => {
    if (processing.current) return;
    if (!cart.length || !invoice || totalError) {
      setError(
        totalError ||
          "Select a drink and wait for an invoice number before checkout.",
      );
      return;
    }
    processing.current = true;
    setBusy(true);
    setError("");
    const release = () => {
      processing.current = false;
      setBusy(false);
    };
    Alert.alert(
      "Confirm payment received",
      `${invoice.invoice}\n${money(total)} via ${payment}\n\nRecord this transaction only after you have received payment. Card and QR payments must be confirmed separately.`,
      [
        { text: "Cancel", style: "cancel", onPress: release },
        {
          text: "Confirm payment",
          onPress: () =>
            void (async () => {
              let committed = false;
              try {
                await checkout({
                  ...invoice,
                  ...values,
                  account: usePOS.getState().account!,
                  items: cart,
                  payment,
                });
                committed = true;
                setSuccess(
                  `${invoice.invoice} · ${money(total)} recorded · In Queue`,
                );
                usePOS.getState().clear();
                reset();
                setPayment("Cash");
                setInvoice(null);
                usePOS
                  .getState()
                  .notify({ title: "Payment Received Successfully!", message: "Order " + invoice.invoice + " created and confirmed.\n" + money(total) + " via " + payment });
                await usePOS.getState().refresh();
                setLastOrder(
                  usePOS.getState().orders.find((o) => o.id === invoice.id) ??
                    null,
                );
              } catch (e) {
                showError(e);
                setError(
                  `${committed ? "Transaction saved. Refresh the workspace to view it. " : ""}${errorText(e)}`,
                );
              } finally {
                if (committed) await reserve();
                release();
              }
            })(),
        },
      ],
      { cancelable: false },
    );
  });
  const productCards = (managing: boolean) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {products.filter(p => (p.name + ' ' + p.description).toLowerCase().includes(search.toLowerCase())).map((p, index) => {
        const selectedQuantity = cart.find(item => item.productId === p.id)?.quantity ?? 0;
        return <ProductTile key={p.id} testID={'product-' + p.id} selected={!managing && selectedQuantity > 0} style={[S.panel, {
          width: width < 560 ? '100%' : '48%', padding: 12, gap: 16,
          borderColor: !managing && selectedQuantity > 0 ? C.accent : C.line,
          opacity: p.available || managing ? 1 : 0.6,
        }]}>
          <View style={{ position: 'relative' }}>
            {p.image ? <Image source={{ uri: p.image }} accessibilityLabel={p.name} style={{ height: width < 560 ? 220 : 240, width: '100%', borderRadius: 8 }} /> :
              <View style={{ height: width < 560 ? 220 : 240, borderRadius: 8, backgroundColor: index % 2 ? '#E8EEDF' : '#F2E9DB', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <Coffee size={80} color={index % 2 ? '#516D42' : '#876644'} strokeWidth={1.1} />
                <Text style={{ color: index % 2 ? '#435C36' : '#715334', fontSize: 13 }}>Your drink photo</Text>
              </View>}
            <View style={{ position: 'absolute', right: 10, top: 10, backgroundColor: '#FFFFFF', borderRadius: 6, padding: 9, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: p.available ? '#249B72' : C.danger }} />
              <Text style={{ color: C.ink, fontSize: 12, fontWeight: '600' }}>{p.available ? 'Available' : 'Unavailable'}</Text>
            </View>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ color: C.ink, fontSize: 21, lineHeight: 27, fontWeight: '600' }}>{p.name}</Text>
            <Text style={{ color: C.ink, fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{money(p.price)}</Text>
            {!!p.description && <Text style={S.muted} numberOfLines={2}>{p.description}</Text>}
          </View>
          <Button label={managing ? 'Edit ' + p.name : p.available ? 'Add to order' : 'Unavailable'} icon={managing ? Edit3 : Plus} tone={managing ? 'secondary' : 'primary'} disabled={!managing && (!p.available || busy)} onPress={() => {
            if (managing) { setEditing(p); setEditor(true); }
            else { add(p); setError(''); setSuccess(''); }
          }} style={{ minHeight: 50 }} />
          {!managing && selectedQuantity > 0 && <Text accessibilityLiveRegion="polite" style={{ color: C.accent, fontSize: 13, textAlign: 'center', fontWeight: '600' }}>{selectedQuantity} in current order</Text>}
        </ProductTile>;
      })}
    </View>
  );
  const catalog = <>
    <Heading title={manage ? 'Manage drinks' : 'Drink menu'} subtitle={manage ? 'Edit your products here, then finish to take orders.' : 'Select drinks to add to the current order.'} action={manage ? <View style={[S.row, { gap: 8, flexWrap: 'wrap' }]}>
      <Button label="Finish managing" tone="secondary" style={{ height: 46, flexShrink: 0, paddingHorizontal: 24 }} onPress={() => setManage(false)} />
      <Button label="Add drink" icon={Plus} style={{ height: 46, flexShrink: 0, paddingHorizontal: 24 }} onPress={() => { setEditing(null); setEditor(true); }} />
    </View> : <Button label="Manage drinks" icon={Edit3} tone="secondary" onPress={() => setManage(true)} />} />
    <TextInput accessibilityLabel="Search menu" placeholder="Search menu" placeholderTextColor={C.muted} value={search} onChangeText={setSearch} style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 6, paddingHorizontal: 14, height: 44, color: C.ink, fontSize: 14 }} />
    {products.some(p => p.price === 0) && <Text style={S.muted}>Some drinks are priced at PHP 0.00. Use Manage drinks to set your prices before taking payments.</Text>}
    <View style={[S.row, { justifyContent: 'space-between' }]}><Text style={S.h2}>Drinks</Text><Text style={S.muted}>{products.filter(p => p.available).length} available</Text></View>
    {productCards(manage)}
    {!products.some(p => (p.name + ' ' + p.description).toLowerCase().includes(search.toLowerCase())) && <Empty icon={Coffee} title="No matching drinks" detail="Try another name or description, or add a drink with Manage drinks." />}
  </>;
  const summary = <View style={[S.panel, { width: wide ? 350 : '100%', flexGrow: 1, minHeight: wide ? 650 : undefined }]}>
    <View style={[S.row, { justifyContent: 'space-between' }]}><Text style={{ color: C.ink, fontSize: 16, fontWeight: '600' }}>Order summary</Text><ShoppingBag size={22} color={C.accent} /></View>
    {!!success && <Text accessibilityLiveRegion="polite" style={{ color: C.accent, fontWeight: '600' }}>{success}</Text>}
    {!!success && !!lastOrder && <Button label="View receipt" tone="secondary" onPress={() => setReceipt(lastOrder)} />}
    <ErrorMessage message={error || reservationError || totalError} />
    {!!reservationError && <Button label="Retry invoice reservation" tone="secondary" onPress={() => void reserve()} />}
    {!cart.length ? <Empty icon={ShoppingBag} title="No products selected" detail="Select a drink to start an order. Your order summary will appear here." /> : <>
      <Text style={S.muted}>{invoice?.invoice ?? 'Reserving invoice...'} - time recorded at checkout</Text>
      {cart.map(item => <View key={item.productId} style={{ gap: 8 }}>
        <View style={S.row}><View style={S.flex}><Text style={[S.text, { fontWeight: '600' }]}>{item.name}</Text><Text style={S.muted}>{money(item.price)} each</Text></View><IconButton label={'Remove ' + item.name} icon={Trash2} disabled={busy} onPress={() => remove(item.productId)} /></View>
        <View style={[S.row, { justifyContent: 'space-between' }]}><View style={S.row}>
          <IconButton label={'Decrease ' + item.name + ' quantity'} icon={Minus} disabled={busy || item.quantity === 1} onPress={() => quantity(item.productId, -1)} />
          <Text style={[S.text, { fontVariant: ['tabular-nums'] }]}>{item.quantity}</Text>
          <IconButton label={'Increase ' + item.name + ' quantity'} icon={Plus} disabled={busy || item.quantity === 999} onPress={() => quantity(item.productId, 1)} />
        </View><Text style={S.text}>{money(item.price * item.quantity)}</Text></View><View style={S.line} />
      </View>)}
      {(['customer', 'staff'] as const).map(name => <Controller key={name} name={name} control={control} render={({ field, fieldState }) => <Field label={name === 'customer' ? 'Customer name' : 'Staff name'} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={fieldState.error?.message} maxLength={100} editable={!busy} autoCapitalize="words" />} />)}
      <Text style={[S.text, { fontWeight: '600' }]}>Payment method</Text>
      <View style={{ gap: 6, flexDirection: 'row' }} accessibilityRole="radiogroup">{payments.map(method => <Button key={method} style={{ flex: 1, paddingHorizontal: 6 }} label={method === 'Debit/Credit Card' ? 'Card' : method === 'QR Payment' ? 'QR' : method} tone={payment === method ? 'primary' : 'secondary'} disabled={busy} onPress={() => setPayment(method)} />)}</View>
      <View style={S.line} />
      <View style={[S.row, { justifyContent: 'space-between' }]}><Text style={S.muted}>Subtotal</Text><Text style={S.text}>{money(total)}</Text></View>
      <View style={[S.row, { justifyContent: 'space-between' }]}><Text style={S.muted}>Discount</Text><Text style={S.text}>{money(0)}</Text></View>
      <View style={[S.row, { justifyContent: 'space-between' }]}><Text style={S.h2}>Total</Text><Text style={S.amount}>{money(total)}</Text></View>
      <Text style={S.muted}>No tax or service charge. Payment is confirmed by you.</Text>
      <Button label="Process transaction" icon={CreditCard} busy={busy} disabled={!invoice || !!totalError} onPress={submit} />
    </>}
  </View>;
  return <View style={{ flex: 1 }}>
    {wide ? <View style={{ flex: 1, flexDirection: 'row' }}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }}>{catalog}</ScrollView>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ width: 370, flexGrow: 0, borderLeftWidth: 1, borderColor: C.line, backgroundColor: C.surface }} contentContainerStyle={{ padding: 10, flexGrow: 1 }}>{summary}</ScrollView>
    </View> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}>{catalog}{summary}</ScrollView>}
    <ProductEditor visible={editor} product={editing} onClose={() => setEditor(false)} />
    <OrderDetails order={receipt} onClose={() => setReceipt(null)} />
  </View>;
}
